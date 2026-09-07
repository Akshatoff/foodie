import foodsData from "@/data/foods.json";
import { FoodDatabaseEntry, FoodCategory } from "@/types/foods";

const FOODS = foodsData as FoodDatabaseEntry[];

// ---- id lookup -----------------------------------------------------------

const byId = new Map<string, FoodDatabaseEntry>(FOODS.map((f) => [f.id, f]));

export function getFoodById(id: string): FoodDatabaseEntry | undefined {
  return byId.get(id);
}

export function getFoodsByCategory(category: FoodCategory): FoodDatabaseEntry[] {
  return FOODS.filter((f) => f.category === category);
}

export function getAllFoods(): FoodDatabaseEntry[] {
  return FOODS;
}

// ---- fuzzy search ----------------------------------------------------------

/**
 * Classic Levenshtein edit distance (insert/delete/substitute), used as a
 * typo-tolerance fallback once exact/substring matching comes up empty.
 * O(a.length * b.length) - fine here since we only ever run it against
 * short food names/aliases (a handful of words), not paragraphs.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currRow = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[b.length];
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Match quality tiers, best first - used only for sorting, not shown to users. */
const enum MatchTier {
  ExactName = 0,
  ExactAlias = 1,
  NameStartsWith = 2,
  AliasStartsWith = 3,
  NameContains = 4,
  AliasContains = 5,
  Fuzzy = 6,
}

interface ScoredMatch {
  entry: FoodDatabaseEntry;
  tier: MatchTier;
  /** Lower is better within a tier (edit distance, or match position). */
  tieBreaker: number;
}

/**
 * How many typo'd characters we're willing to tolerate before giving up on
 * a fuzzy match, scaled to word length - a 3-letter query needs an exact
 * or near-exact hit, a 10-letter query can absorb a couple of typos.
 */
function fuzzyThreshold(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

function bestFuzzyDistance(query: string, entry: FoodDatabaseEntry): number {
  const candidates = [entry.name, ...entry.aliases].map(normalize);
  let best = Infinity;
  for (const candidate of candidates) {
    // Compare against the whole candidate and, for multi-word candidates,
    // each individual word - so "chiken" matches "chicken curry" via the
    // word "chicken", not just the full four-word string. Words shorter
    // than 4 characters are skipped: short words (e.g. "full", "dal",
    // "of") produce false-positive fuzzy matches under edit distance far
    // too easily to be worth the typo tolerance.
    const words = candidate.split(/\s+/).filter((w) => w.length >= 5);
    for (const word of [candidate, ...words]) {
      const d = levenshtein(query, word);
      if (d < best) best = d;
    }
  }
  return best;
}

export interface FoodSearchOptions {
  /** Max results to return. Default 20. */
  limit?: number;
  /** Restrict the search to one category. */
  category?: FoodCategory;
}

/**
 * Searches the offline food database by name or alias, tolerant of partial
 * input and minor typos. Ranked in tiers (exact > starts-with > contains >
 * fuzzy) so a precise match always outranks a loose one, then alphabetized
 * within a tier for stable, predictable ordering.
 *
 * Empty/whitespace query returns the first `limit` foods unfiltered (handy
 * for showing a default list before the user starts typing).
 */
export function searchFoods(query: string, options: FoodSearchOptions = {}): FoodDatabaseEntry[] {
  const { limit = 20, category } = options;
  const pool = category ? getFoodsByCategory(category) : FOODS;

  const q = normalize(query);
  if (q.length === 0) return pool.slice(0, limit);

  const matches: ScoredMatch[] = [];

  for (const entry of pool) {
    const name = normalize(entry.name);
    const aliases = entry.aliases.map(normalize);

    if (name === q) {
      matches.push({ entry, tier: MatchTier.ExactName, tieBreaker: 0 });
      continue;
    }
    if (aliases.includes(q)) {
      matches.push({ entry, tier: MatchTier.ExactAlias, tieBreaker: 0 });
      continue;
    }
    if (name.startsWith(q)) {
      matches.push({ entry, tier: MatchTier.NameStartsWith, tieBreaker: name.length });
      continue;
    }
    const aliasStartIdx = aliases.findIndex((a) => a.startsWith(q));
    if (aliasStartIdx !== -1) {
      matches.push({
        entry,
        tier: MatchTier.AliasStartsWith,
        tieBreaker: aliases[aliasStartIdx].length,
      });
      continue;
    }
    if (name.includes(q)) {
      matches.push({ entry, tier: MatchTier.NameContains, tieBreaker: name.indexOf(q) });
      continue;
    }
    const aliasContainIdx = aliases.findIndex((a) => a.includes(q));
    if (aliasContainIdx !== -1) {
      matches.push({
        entry,
        tier: MatchTier.AliasContains,
        tieBreaker: aliases[aliasContainIdx].indexOf(q),
      });
      continue;
    }

    // Fuzzy fallback - only worth trying once every cheaper check has
    // failed, since Levenshtein is the most expensive comparison here.
    const distance = bestFuzzyDistance(q, entry);
    if (distance <= fuzzyThreshold(q.length)) {
      matches.push({ entry, tier: MatchTier.Fuzzy, tieBreaker: distance });
    }
  }

  matches.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tieBreaker !== b.tieBreaker) return a.tieBreaker - b.tieBreaker;
    return a.entry.name.localeCompare(b.entry.name);
  });

  return matches.slice(0, limit).map((m) => m.entry);
}
