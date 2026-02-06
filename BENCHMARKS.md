# Benchmarks

These are microbenchmarks to compare internal data-structure and hot-path changes. They are not a promise of real-world throughput.

Command
`bun run bench`
`bun run bench:structures`

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

## Summary

Kept precomputed pattern segments and the `listeningTo` Set. The `isPatternName` fast path is low risk and keeps wildcard-free paths cheaper. Map remains the best fit for event storage based on the structure microbench.
