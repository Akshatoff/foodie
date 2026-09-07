# AI Food Tracker

A React Native (Expo) app that photographs a meal, sends it to Gemini 2.5
Flash for nutritional analysis, and tracks it against daily/weekly/monthly
goals with tags, streaks, water, and activity suggestions.

## 1. Project setup

```bash
# Create the project (or just use this folder as-is)
npx create-expo-app ai-food-tracker -t expo-template-blank-typescript
cd ai-food-tracker

# Core dependencies
npx expo install expo-camera expo-file-system expo-constants expo-status-bar \
  react-native-safe-area-context react-native-screens react-native-gesture-handler \
  @react-native-async-storage/async-storage

# Navigation
npm install @react-navigation/native @react-navigation/native-stack

# State
npm install zustand react-native-uuid

# AI SDK
npm install @google/genai
```

Then copy `App.tsx`, `babel.config.js`, `metro.config.js`, `tsconfig.json`,
`app.json`, `eas.json`, and the `src/` folder from this project into your
app, overwriting the generated defaults.

**Note on styling:** this project uses plain React Native `StyleSheet`
throughout (no NativeWind/Tailwind). An earlier version used NativeWind v2,
but it turned out to be unreliable on Expo SDK 51 / React Native 0.74 -
classNames were silently not being transformed into actual styles, which
made the whole UI render unstyled (wrong background, absolutely-positioned
elements collapsing into normal flow, etc). Plain `StyleSheet.create` has no
build-time transform step to go wrong, so it's the safer default here. If
you want Tailwind-style utility classes later, reach for **NativeWind v4**
(not v2) and verify it against your exact Expo SDK version first.

## 2. Environment variables

### Local development

```bash
cp .env.example .env
# then edit .env and paste your Gemini API key
```

Expo only inlines env vars prefixed with `EXPO_PUBLIC_`, which is why the
service reads `process.env.EXPO_PUBLIC_GEMINI_API_KEY`. Restart the dev
server after changing `.env` (Expo caches env vars per process).

**`.env` is for local development only.** It's gitignored by design, which
means EAS Build servers never see it - if you skip the next step, your key
will be `undefined` in any build produced by `eas build`, and every Gemini
call will fail.

### EAS Build (`eas build --profile ...`)

`.env` files aren't uploaded to EAS Build. You need to register the key as
an **EAS environment variable** so it gets inlined during the build itself:

```bash
eas login   # if you haven't already

# Create the variable for each environment you build with. "sensitive"
# hides it in the dashboard/CLI output but still lets EAS Build read it and
# inline it into the bundle - which it has to, since EXPO_PUBLIC_ variables
# always end up embedded in client code anyway. Don't use "secret" here:
# secret variables are stripped before the JS bundle is built, so an
# EXPO_PUBLIC_ var marked secret will come out empty in the app.
eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value YOUR_KEY \
  --environment production --visibility sensitive
eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value YOUR_KEY \
  --environment preview --visibility sensitive
eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value YOUR_KEY \
  --environment development --visibility sensitive

# Verify it's set
eas env:list --environment production
```

`eas.json` (included in this project) ties each build profile to one of
these environments via the `"environment"` field, so `eas build --profile
production` automatically pulls the `production` copy of the variable.

If a build still comes back with "API key not valid" after this, double
check with `eas env:list` that the variable actually exists for the
environment your build profile points at - a build run with `--profile
preview` won't see a variable you only created under `production`.

⚠️ **Production note:** bundling an API key into a client app means it can be
extracted from the binary regardless of how it got there (`.env` or EAS env
vars) - anyone can decompile the app and read it. For a real production
release, proxy the Gemini call through your own backend (or a serverless
function) instead of calling `@google/genai` directly from the client, and
skip embedding a Gemini key in the app at all.

## 3. Run it

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator/emulator.
Camera capture requires a physical device or a simulator with camera
passthrough — the iOS Simulator's camera returns a black frame.

## 4. Directory structure

```
App.tsx                        # NavigationContainer + theme
app.json                       # Expo config, camera permission strings
eas.json                       # EAS Build profiles, each tied to an EAS environment
babel.config.js                # babel-preset-expo only (no NativeWind)
metro.config.js                # @/ path alias resolution
src/
  theme/colors.ts               # Shared color tokens used by every StyleSheet
  types/index.ts               # MealAnalysis, LoggedMeal, GoalSet, tags, RootStackParamList
  store/
    mealStore.ts                # Persisted: meals, addMeal(with tags), today's totals
    goalsStore.ts                # Persisted: daily/weekly GoalSet, body weight
    tagsStore.ts                 # Persisted: custom tags, merged with DEFAULT_TAGS
  services/aiService.ts        # Gemini call: retry+backoff, model fallback chain, validation
  data/
    commonFoods.ts               # Offline per-100g macro table for manual entry
    exercises.ts                  # MET values for activity-suggestion estimates
  utils/
    format.ts                    # Small display-formatting helpers
    nutrition.ts                  # Date grouping, macro sums, goal-met logic, water/exercise math
  navigation/RootNavigator.tsx # Stack: Home, Camera, Results, ManualEntry, Goals, Progress, Calendar
  screens/
    HomeScreen.tsx              # Totals, tag filter, water card, activity nudge, FAB
    CameraScreen.tsx            # Permissions, capture, retry/fallback UI on failure
    ResultsScreen.tsx           # Breakdown, tag picker, water card, Save / Retake
    ManualEntryScreen.tsx       # Offline food search + weight entry, zero AI dependency
    GoalsScreen.tsx              # Daily/weekly targets + body weight
    ProgressScreen.tsx           # Daily/Weekly/Monthly totals vs goals
    CalendarScreen.tsx           # Month grid, streaks, goal-met marking
  components/
    MacroStat.tsx                # Single stat (label/value/unit)
    MealListItem.tsx             # Row in the Home screen's meal list, with tag chips
    ProgressBar.tsx              # Current-vs-goal bar, used on Goals/Progress
    TagSelector.tsx              # Multi-select + inline custom-tag creation
    TagFilterBar.tsx             # Home screen's horizontal tag filter chips
    ExerciseSuggestions.tsx      # Activity nudge card
    WaterIntakeCard.tsx          # Water recommendation card
```

## 5. How the flow works

1. **Home** shows totals derived live from the Zustand store (`getTodaysTotals`)
   and the FAB pushes the **Camera** screen as a full-screen modal.
2. **Camera** requests permission via `useCameraPermissions`, and on capture:
   takes the photo with `base64: true`, shows an "Analyzing meal..." spinner,
   and calls `analyzeMealImage()`. On success it navigates straight to
   **Results** with the parsed data; on failure it shows an inline error
   banner and lets the user retry without leaving the camera.
3. **Results** renders the image, summary, total calories, and a per-item
   macro breakdown. **Save Meal** commits to the store and resets navigation
   back to Home; **Retake** replaces the current screen with Camera.

## 6. Error handling included

- Camera permission denied → in-app explanation with a "Grant Camera Access"
  retry button, a "Not now" escape hatch, and a manual-entry link — never a
  silent dead end.
- Missing/invalid API key → surfaced as a specific error string, not a crash.
- Network/API failure → caught, wrapped with a readable message, shown as a
  banner on the Camera screen.
- Request timeout (20s per attempt) → explicit "request timed out" message
  rather than an indefinite spinner.
- Malformed or non-JSON model output → validated structurally
  (`isValidMealAnalysis`) before it ever reaches the UI; invalid responses
  are treated as failures, not partially-rendered garbage.

## 7. Resilience: what happens when Gemini is overloaded (503)

`src/services/aiService.ts` treats "model overloaded" as an expected,
recoverable condition rather than a hard failure:

1. **Retry with backoff** — on a 503/`overloaded`/`UNAVAILABLE` response (or a
   429 rate limit), it retries the *same* model up to `MAX_RETRIES_PER_MODEL`
   (2) times, waiting `800ms → 1600ms → ...` (exponential, plus jitter)
   between attempts.
2. **Fall back to a lighter model** — if a model is still failing after its
   retries, the request moves to the next entry in `MODEL_CHAIN`:
   `gemini-2.5-flash → gemini-2.5-flash-lite → gemini-2.0-flash`. This is
   usually enough on its own, since the lite/2.0 models are typically under
   less load.
3. **Give up gracefully** — only once every model in the chain has been
   exhausted does `analyzeMealImage` return
   `{ success: false, code: "OVERLOADED", error }`. Non-retryable errors
   (bad JSON, invalid API key, timeout) short-circuit immediately instead of
   wasting retries on something that won't fix itself.

**On the UI side**, `CameraScreen` keeps the captured photo in memory, so a
failure shows an error banner with two recovery actions instead of forcing a
retake:
- **Try Again** — re-runs `analyzeMealImage` on the same photo (useful for
  transient overload).
- **Enter Manually** — jumps to `ManualEntryScreen` with that photo still
  attached, so the flow degrades instead of dead-ending.

## 8. Manual entry (works with zero AI / zero network)

`src/screens/ManualEntryScreen.tsx` + `src/data/commonFoods.ts` provide a
fully offline path to log a meal:

- A small bundled reference table (~40 common foods, per-100g macros —
  extend `COMMON_FOODS` freely) is searched client-side, no API call.
- Tapping a food adds it with a default 100g weight; the weight is editable
  per item and macros scale live (`calories/protein/carbs/fat × weight/100`).
- "Continue" builds a `MealAnalysis` object (`source: "manual"`) and hands
  off to the *same* Results screen used by the AI path, so saving, the
  Zustand store, and the daily dashboard all just work — no special-casing
  needed elsewhere in the app.
- Reachable three ways: from the Camera screen's error banner (photo
  attached), from a "Skip photo, log manually" link on the idle Camera
  screen, and from a small pencil icon next to the Home screen's FAB (no
  photo at all, for users who never want to use the camera).

## 9. Daily tracking: tags, goals, streaks, water & activity

### Tags
- Default tags (`Breakfast`, `Lunch`, `Dinner`, `Snacks`, `Energy Recovery`)
  live in `src/types/index.ts` (`DEFAULT_TAGS`). Custom tags are user-created
  and persisted in `src/store/tagsStore.ts`, merged with the defaults via
  `getAllTags()`.
- Tags are chosen on the **Results** screen (`TagSelector`) before saving -
  multi-select, plus inline "+ New tag" creation.
- Home screen filters the meal list by tag via `TagFilterBar` (horizontal
  chips, single-select, "All" resets). The daily summary card always shows
  true unfiltered totals; only the list below it is filtered.

### Goals (`src/store/goalsStore.ts`, `src/screens/GoalsScreen.tsx`)
- Independent **daily** and **weekly** targets for calories/protein/carbs/fat,
  persisted to `AsyncStorage`. "Use daily × 7" is a convenience button, not a
  hard link - you can set a weekly goal that isn't 7x the daily one.
- A **body weight** field (kg) is stored here too - it's only used to
  personalize the water and exercise estimates below, never sent anywhere.

### Progress: Daily / Weekly / Monthly (`src/screens/ProgressScreen.tsx`)
- Segmented control switches the aggregation window. Daily and weekly use
  the stored goals directly; monthly derives its target as
  `dailyGoal x days-in-month` (there's no separate monthly goal input).
- Weekly view adds a simple 7-bar calorie chart (plain `View`s, no charting
  library) so you can see which days ran high/low at a glance.

### Calendar & streaks (`src/screens/CalendarScreen.tsx`)
- A month grid where each day is marked green if that day's totals satisfy
  `isGoalMet()` (in `src/utils/nutrition.ts`): calories within roughly 70-115%
  of the daily goal AND protein at least 85% of target. This is intentionally
  lenient - it's a motivational streak, not a compliance audit - and the
  thresholds are one constant-block away from being tuned if you want it
  stricter or looser.
- `computeStreak()` counts consecutive goal-met days ending today; if nothing
  is logged yet today, it counts back from yesterday instead so an
  in-progress day doesn't zero out the streak.
- Days with meals logged but the goal missed show a dim red dot instead of
  green, so "no data" and "missed" are visually distinct.

### Water intake (`WaterIntakeCard`, `estimateWaterIntakeMl` in `nutrition.ts`)
- Shown on the Home screen (running total for today) and on the Results
  screen right after analysis (projected total including the meal you're
  about to save).
- Formula: `weightKg × 35ml + caloriesConsumedToday × 0.3ml`, rounded to the
  nearest 50ml. This is a general-wellness heuristic, explicitly labeled as
  such in the UI - not medical guidance.

### Activity suggestions (`ExerciseSuggestions`, `minutesToBurn` in `nutrition.ts`)
- Appears on Home whenever today's calories exceed the daily goal. Shown
  deliberately: a fixed variety of 4 activities (not a full compensatory
  calculator) with an estimated duration via the standard MET formula
  (`kcal/min = MET x 3.5 x weightKg / 200`), copy that explicitly says this
  isn't about "making up for" the day, and a disclaimer that it's a rough
  estimate. This framing is intentional - the feature is meant to nudge
  toward movement, not to encourage compensatory exercise for what was
  eaten. If you plan to extend this, keep that framing in mind.

### Persistence
All three stores (`mealStore`, `goalsStore`, `tagsStore`) use Zustand's
`persist` middleware backed by `@react-native-async-storage/async-storage`,
so meals, goals, and tags survive app restarts - required for weekly/monthly
views and streaks to mean anything. Data is local to the device only.

## 10. Quantity stepper (log "2 rotis" without a second photo)

Two entry points, one shared idea: adjust quantity instead of re-capturing.

- **Results screen (AI or manual path)** - every item card has a +/− stepper
  (`QuantityStepper`) next to its confidence score. Bumping it re-derives
  that item's weight and macros from the *original* detected/entered values
  via `scaleFoodItem()` in `src/utils/nutrition.ts` - it always scales from
  the base item, never compounds on a previous scale, so going 1→3→2 gives
  the same result as going straight to 2. The meal's total calories and the
  water-intake estimate recompute live from the adjusted items.
- **Manual entry screen** - countable foods (`roti`, `egg`, `banana`, `apple`,
  `samosa`, pizza/bread by the slice, etc.) carry a `unit` definition in
  `src/data/commonFoods.ts` (e.g. `{ label: "roti", gramsPerUnit: 40 }`).
  For these, tapping the food a second time - or using the stepper directly
  in the selected-items list - increments a quantity instead of asking for
  grams. Foods without a defined unit (rice, dal, etc.) keep the original
  grams text input, since "2 rotis" makes sense but "2 rice" doesn't.

`FoodItem.quantity` (optional, defaults to 1/omitted) is saved alongside the
final weight/macros mostly for display - the weight and macro numbers are
always the authoritative, already-scaled values; quantity is "how we got
there," not something downstream code needs to multiply by again.

## 11. Calendar/streak fixes and editing a saved meal

**Calendar layout bug (fixed):** the month grid used to lay out 7 columns
with percentage-string widths (`"14.2857...%"`) inside a `flexWrap` row.
React Native's Yoga layout engine doesn't always sum repeating fractional
percentages to exactly 100%, so the 7th cell in a row could wrap
unpredictably on some devices, garbling the whole grid. `CalendarScreen`
now builds explicit rows of exactly 7 fixed-pixel-width cells
(`useWindowDimensions` based), which can't misalign regardless of platform
rounding behavior.

**Streak not counting despite hitting the daily goal (fixed):** `isGoalMet`
used to silently require protein to reach 85% of your protein goal *in
addition to* the calorie check - so a day where you hit your calorie target
but ran a bit low on protein wouldn't count, with zero indication why. It's
calorie-only now (`src/utils/nutrition.ts`). If you want a stricter
"hit-all-your-macros" mode later, make it an explicit toggle rather than a
silent default - that was the whole problem.

**Editing a saved meal's quantity:** tapping a meal on the Home screen
(anywhere except the × delete button) reopens it on the Results screen in
edit mode - same quantity steppers as before, but now pre-filled with
whatever was actually saved. Saving calls `updateMeal()` (overwrites the
existing entry) instead of `addMeal()` (which would've created a
duplicate), and there's a "Delete" button in place of "Retake" since
retaking doesn't make sense for an already-logged meal.

Internally this relies on `scaleFoodItem` / `unscaleFoodItem` in
`src/utils/nutrition.ts` being exact inverses: `unscaleFoodItem` divides a
saved item's weight/macros back down to a "1 unit" baseline using its
stored `quantity`, and `scaleFoodItem` multiplies back up from that
baseline - so reopening a meal and nudging the stepper never compounds on
top of a previous scale.

## 12. Calendar garbling, green/red mismatch, and undo-delete (round 2 fixes)

**Calendar digits garbled/misaligned (fixed, take 2):** the first fix
switched from percentage-string widths to a `useWindowDimensions`-computed
pixel width, which still wasn't reliable - `windowWidth` doesn't always
match the actual rendered row width once margins/safe-area insets are
accounted for, and any mismatch there reintroduces the same clipping/
misalignment. The grid cells now use `flex: 1` instead of any computed
width at all - React Native divides the row evenly on its own, so there's
no arithmetic left for us to get wrong.

**Green vs. red circle mismatch (fixed):** `isGoalMet` still had an upper
bound left over from the first pass - it capped "met" at ≤115% of your
calorie goal, so exceeding your goal by more than 15% still counted as
"missed" and showed red, even though you'd clearly hit (and passed) your
target. There's no upper bound now - reaching or exceeding ~85% of your
calorie goal counts as met.

**Undo after deleting a meal:** `mealStore` now keeps the most recently
deleted meal in memory (`lastDeleted` - explicitly excluded from
AsyncStorage via `partialize`, so it can't reappear on next app launch) for
6 seconds after a delete. A small "Deleted '<meal>' · Undo" banner
(`UndoSnackbar`) appears above the FAB on Home during that window;
`undoDelete()` re-inserts the exact same meal (same id, timestamp, tags)
back into its original chronological position. This applies whether the
delete came from the × button on Home or the Delete button in the
edit-a-saved-meal screen.

**Tap-to-edit quantity:** this was already wired up in the previous round
(tap anywhere on a meal row except the × button → opens Results in edit
mode with quantity steppers) - `HomeScreen.handleEditMeal` →
`navigation.navigate("Results", { ..., mealId })`. If it's not opening for
you, it's almost certainly a stale Metro bundle - the NativeWind fix
earlier in this project had the same symptom. Do a full clean rebuild:

```bash
rm -rf node_modules package-lock.json .expo
npx expo start -c
```
