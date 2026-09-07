import { ExerciseOption } from "@/types";

/**
 * MET (Metabolic Equivalent of Task) values - standard, widely published
 * approximations (Compendium of Physical Activities). Used only for rough
 * "minutes needed" estimates, not medical-grade calculations.
 */
export const EXERCISE_OPTIONS: ExerciseOption[] = [
  { id: "walk_brisk", name: "Brisk walking", met: 4.3 },
  { id: "cycling_moderate", name: "Cycling (moderate pace)", met: 7.5 },
  { id: "jogging", name: "Jogging", met: 7 },
  { id: "running", name: "Running (6 mph)", met: 9.8 },
  { id: "swimming", name: "Swimming", met: 8.3 },
  { id: "jump_rope", name: "Jump rope", met: 11 },
  { id: "dancing", name: "Dancing", met: 5.5 },
  { id: "yoga", name: "Yoga / stretching", met: 3 },
  { id: "hiit", name: "HIIT circuit", met: 8 },
  { id: "stairs", name: "Stair climbing", met: 8.8 },
];
