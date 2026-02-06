# Benchmarks

These are microbenchmarks to compare internal data-structure and hot-path changes. They are not a promise of real-world throughput.

Command
`bun run bench`
`bun run bench:structures`
`bun run bench:patterns`

Environment
- Date: 2026-02-06
- Bun: 1.3.1
- samples=5 warmup=2 iters=50,000

## Iteration 1 - Baseline

Change
Baseline (post-coverage cleanup).

Results
| Case | Median (ms) | Ops/s |
| --- | --- | --- |
| trigger (no listeners) | 1.824 | 27,412,281 |
| trigger (1 listener) | 6.055 | 8,258,264 |
| trigger (10 listeners) | 28.527 | 1,752,710 |
| trigger (all listener) | 7.249 | 6,897,741 |
| trigger (pattern match) | 69.722 | 717,129 |
| on/off (100 listeners) | 0.396 | 505,635 |
| listenTo/stopListening | 0.338 | 295,675 |

## Iteration 2 - Precompute pattern event segments

Change
Precompute `eventSegments` once per trigger and reuse in pattern matching.

Results
| Case | Median (ms) | Ops/s |
| --- | --- | --- |
| trigger (no listeners) | 1.558 | 32,101,884 |
| trigger (1 listener) | 6.377 | 7,840,574 |
| trigger (10 listeners) | 20.741 | 2,410,694 |
| trigger (all listener) | 7.575 | 6,600,370 |
| trigger (pattern match) | 24.975 | 2,001,992 |
| on/off (100 listeners) | 0.192 | 1,042,796 |
| listenTo/stopListening | 0.471 | 212,089 |

## Iteration 3 - isPatternName fast path

Change
Skip `splitName` when the event name does not contain the wildcard segment.

Results
| Case | Median (ms) | Ops/s |
| --- | --- | --- |
| trigger (no listeners) | 1.629 | 30,696,824 |
| trigger (1 listener) | 7.531 | 6,638,930 |
| trigger (10 listeners) | 26.175 | 1,910,229 |
| trigger (all listener) | 7.933 | 6,303,183 |
| trigger (pattern match) | 28.955 | 1,726,795 |
| on/off (100 listeners) | 0.427 | 468,567 |
| listenTo/stopListening | 0.184 | 544,218 |

## Iteration 4 - listeningTo Set

Change
Replace `listeningTo` Map + id tracking with a `Set` of emitters.

Results
| Case | Median (ms) | Ops/s |
| --- | --- | --- |
| trigger (no listeners) | 1.654 | 30,228,211 |
| trigger (1 listener) | 5.888 | 8,491,727 |
| trigger (10 listeners) | 21.555 | 2,319,598 |
| trigger (all listener) | 6.788 | 7,365,669 |
| trigger (pattern match) | 22.498 | 2,222,387 |
| on/off (100 listeners) | 0.118 | 1,696,713 |
| listenTo/stopListening | 0.138 | 726,612 |

## Iteration 5 - events Map vs object check

Change
Dedicated microbench comparing Map vs object for set/get/delete workload.

Results
| Structure | Median (ms) | Ops/s |
| --- | --- | --- |
| Map | 5.649 | 53,107,130 |
| Object | 10.263 | 29,230,151 |

Decision
Keep `Map` for `events` storage (faster on this workload).

## Iteration 6 - Pattern matching algorithms

Change
Compare pattern matching strategies for wildcard-heavy workloads.

Results (patterns=300, events=900)
Suite: mixed wildcards
| Strategy | Median (ms) | Ops/s |
| --- | --- | --- |
| segments (precomputed) | 4.155 | 64,982,606 |
| split per match | 94.772 | 2,848,954 |
| regex (compiled) | 9.698 | 27,839,833 |

Suite: trailing wildcard only
| Strategy | Median (ms) | Ops/s |
| --- | --- | --- |
| segments (precomputed) | 5.181 | 52,117,686 |
| split per match | 80.489 | 3,354,478 |
| regex (compiled) | 15.189 | 17,775,827 |
| prefix (trailing `*`) | 3.518 | 76,737,246 |

Decision
Keep precomputed segment matching for correctness and overall speed across mixed patterns. Prefix-only checks are faster for trailing-only patterns but do not cover middle wildcards.

## Iteration 7 - Hybrid prefix matcher for trailing wildcards

Change
Precompile trailing-wildcard-only patterns to prefix matchers while keeping segment matching for mixed wildcards.

Results (eventify microbench)
| Case | Median (ms) | Ops/s |
| --- | --- | --- |
| trigger (no listeners) | 1.723 | 29,017,755 |
| trigger (1 listener) | 6.185 | 8,084,019 |
| trigger (10 listeners) | 22.503 | 2,221,918 |
| trigger (all listener) | 6.519 | 7,669,348 |
| trigger (pattern match) | 21.779 | 2,295,768 |
| on/off (100 listeners) | 0.109 | 1,841,197 |
| listenTo/stopListening | 0.141 | 711,111 |

Results (patterns=300, events=900)
Suite: mixed wildcards
| Strategy | Median (ms) | Ops/s |
| --- | --- | --- |
| segments (precomputed) | 4.429 | 60,968,147 |
| split per match | 94.170 | 2,867,156 |
| regex (compiled) | 9.993 | 27,018,575 |

Suite: trailing wildcard only
| Strategy | Median (ms) | Ops/s |
| --- | --- | --- |
| segments (precomputed) | 5.353 | 50,437,828 |
| split per match | 87.348 | 3,091,072 |
| regex (compiled) | 15.264 | 17,689,162 |
| prefix (trailing `*`) | 3.616 | 74,660,399 |

Decision
Use prefix matching for trailing-only wildcard patterns and keep segment matching for mixed wildcards.

## Summary

Kept precomputed pattern segments and the `listeningTo` Set. The `isPatternName` fast path keeps wildcard-free paths cheap. Map remains the best fit for event storage based on the structure microbench, and the runtime now uses a hybrid pattern matcher: prefix checks for trailing-only wildcards and segment matching for mixed wildcards.
