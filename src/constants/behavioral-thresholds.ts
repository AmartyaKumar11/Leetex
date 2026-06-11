/** Seconds before first edit — short reading phase */
export const SHORT_READING_MAX_SECONDS = 30

/** Seconds before first edit — immediate coding */
export const IMMEDIATE_CODING_MAX_SECONDS = 10

/** Seconds before first edit — long reading phase */
export const LONG_READING_MIN_SECONDS = 180

/** Run count — heavy iteration */
export const HEAVY_ITERATION_MIN_RUNS = 8

/** Run count — trial and error minimum */
export const TRIAL_ERROR_MIN_RUNS = 3

/** Consecutive failures — repeated failure loop */
export const REPEATED_FAILURE_MIN_COUNT = 3

/** Executions until accepted — fast convergence */
export const FAST_CONVERGENCE_MAX_EXECUTIONS = 2

/** Pass rate ratio — edge case struggle (e.g. 11499/11502) */
export const EDGE_CASE_PASS_RATE_MIN = 0.95

/** Snapshot similarity — small delta for trial-and-error */
export const SMALL_DELTA_SIMILARITY_MIN = 0.85

/** Major rewrite similarity threshold (matches signal layer) */
export const MAJOR_REWRITE_SIMILARITY_MAX = 0.4

/** Seconds after editorial/hint — dependency window */
export const DEPENDENCY_WINDOW_SECONDS = 300

/** Direct solution — max runs */
export const DIRECT_SOLUTION_MAX_RUNS = 2

/** Direct solution — max session duration (seconds) */
export const DIRECT_SOLUTION_MAX_DURATION_SECONDS = 300

/** Experimental exploration — min runs */
export const EXPERIMENTAL_MIN_RUNS = 5

/** Experimental exploration — min snapshots */
export const EXPERIMENTAL_MIN_SNAPSHOTS = 4

/** Late edge case — min prior high-pass runs */
export const LATE_EDGE_CASE_MIN_PRIOR_RUNS = 2
