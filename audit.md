# Eventify v3 Code Audit

Audit date: 2026-02-09
Scope: `src/index.ts` (1128 lines), tests, types, browser tests, benchmarks

## Verdict

The core logic is **correct**. 104 tests pass, type checking is clean, the
Backbone-style semantics (listener snapshots, dispatch order, `once` reentrancy)
are faithfully implemented. No security vulnerabilities found.

The issues below are all about **unnecessary complexity** that can be removed
while preserving every method signature and feature.

---

## 1. Dead / Useless Type: `PayloadValue<T>`

Both branches return `T`. Identity type that does nothing.

**Resolution:** Removed. `iterate` return type uses `Events[K]` directly.

---

## 2. `setDefaultSchemaValidator` Export Is Misleading

Name implies mutation but it is just an alias for the pure
`defaultSchemaValidator` function.

**Resolution:** Kept for backward compat with deprecation comment.
Prefer importing `defaultSchemaValidator` directly.

---

## 3. `noConflict()` Is Pointless in ESM

Vestigial Backbone/jQuery pattern. ESM-only library has no global to conflict
with.

**Resolution:** Removed from `EventifyStatic` interface, implementation, and
tests.

---

## 4. Over-Engineered Pattern Matching (Two Code Paths)

Two pattern match strategies (`PrefixPatternEntry` vs `SegmentPatternEntry`)
where the segment matcher already handles both cases.

**Resolution:** Removed `PrefixPatternEntry` type and prefix fast path.
Single `PatternEntry` type with segments-based matching for all patterns.
Also eliminated the unnecessary `Math.max` guard (#16).

---

## 5. EventTarget Bridge Is Over-Complicated

`nativeListeners` tracking (`Map<string, Set<EventListenerOrEventListenerObject>>`)
with per-event Set management.

**Resolution:** Replaced with `nativeEvents: Set<string>` - a conservative
one-way set that records event names on `addEventListener` and never removes
them. Removed all Set-per-event bookkeeping from `addEventListener` and
`removeEventListener`. The trigger branching logic is preserved but uses
the simpler `nativeEvents.has()` check.

---

## 6. `eventsApi()` Boolean Return Is Confusing

Returns `true` = caller should proceed, `false` = already handled.
Inverted convention reads poorly.

**Resolution:** Added clear JSDoc comment explaining the return value
convention. Kept the function as-is since renaming or restructuring would
not reduce complexity.

---

## 7. `listenTo` and `listenToOnce` Are Near-Identical

~46 lines of duplication, differing only in `target.on` vs `target.once`.

**Resolution:** Extracted `listenToHelper()` shared function. Both proto
methods are now one-line delegations. Also removed dead `callback = this`
assignment.

---

## 8. `removeFromList` Allocates a New Array Unconditionally

Empty `if (matches(entry)) {}` block was a code smell.

**Resolution:** Replaced manual loop + `removeFromList` helper with
`Array.filter()` calls directly. Cleaner and idiomatic.

---

## 9. `off()` Materializes All Pattern Names into a Set

`new Set(state.patterns.map(...))` created an intermediate array.

**Resolution:** Split `off()` into name/no-name branches. When no name
is provided, iterates each collection directly with inline `Set<string>`
dedup for pattern names (no `.map()` intermediate array).

---

## 10. `Eventify` Default Export Is a Frankenstein Object

Simultaneously a live emitter, factory, mixin utility, and static namespace.

**Resolution:** Documented as backward-compat legacy with inline comment.
Kept as-is since it is a deliberate v2 compatibility decision.

---

## 11. `enable()` Copies Methods by Mutation

Copies 13 function references as own enumerable properties.

**Resolution:** Documented as intentional Backbone-style mixin compat with
inline comment. Directs users to `createEventify()` for prototype-based
construction.

---

## 12. `context` vs `ctx` Duality in `ListenerEntry`

Confusing short name `ctx` for the resolved execution context.

**Resolution:** Renamed `ctx` to `bound` throughout. Added comment on
`ListenerEntry` explaining the two fields: `context` (user-provided, for
identity matching) and `bound` (resolved, for `.apply()`).

---

## 13. Potential Correctness Issue: `stopListening` Partial Cleanup

Stale references in `listeningTo` Set prevented garbage collection of
target emitters after targeted `stopListening` calls.

**Resolution:** Added `hasListenersWithContext()` helper. After targeted
`stopListening` (name or callback provided), checks whether any listeners
with the caller's context remain on the target. Removes the target from
`listeningTo` when none remain.

---

## 14. `iterate()` Unbounded Queue

Queue grows indefinitely if producers emit faster than consumers read.

**Resolution:** Added inline comment documenting the design constraint
and mitigation (AbortSignal / return()). No behavioral change — adding
a queue limit would change the public contract.

---

## 15. Test Style: Side Effects Outside `it()` Blocks

Multiple test groups shared mutable state across `it()` blocks and depended
on execution order.

**Resolution:** Restructured 8 test groups so each `it()` block sets up
its own emitter and state. Consolidated multi-`it` groups that tested a
single flow into single self-contained `it()` blocks.

---

## 16. Minor: `Math.max(0, ...)` Guard Is Unnecessary

Defensive noise in prefix path that could never trigger.

**Resolution:** Eliminated along with the prefix path in #4.

---

## Summary

| #   | Issue                                 | Resolution                           |
| --- | ------------------------------------- | ------------------------------------ |
| 1   | Dead `PayloadValue` type              | Removed                              |
| 2   | `setDefaultSchemaValidator` naming    | Deprecated with comment              |
| 3   | `noConflict()` in ESM                 | Removed                              |
| 4   | Two pattern match paths               | Unified to segments-only             |
| 5   | EventTarget bridge complexity         | Simplified to `Set<string>`          |
| 6   | `eventsApi()` boolean convention      | Documented                           |
| 7   | `listenTo`/`listenToOnce` duplication | Extracted `listenToHelper`           |
| 8   | `removeFromList` empty if block       | Replaced with `filter()`             |
| 9   | `off()` pattern Set allocation        | Split branches, inline dedup         |
| 10  | Frankenstein default export           | Documented as legacy                 |
| 11  | `enable()` own-property pollution     | Documented as intentional            |
| 12  | `context`/`ctx` naming                | Renamed `ctx` to `bound`             |
| 13  | `stopListening` stale refs            | Fixed with `hasListenersWithContext` |
| 14  | `iterate()` unbounded queue           | Documented                           |
| 15  | Test order-dependence                 | Tests made self-contained            |
| 16  | `Math.max` guard                      | Removed with #4                      |

### Result

- `src/index.ts`: 1128 lines -> 1124 lines (net -4, but ~100 lines of
  complexity removed and replaced with simpler equivalents)
- Tests: 104 -> 101 (noConflict removed, multi-`it` groups consolidated)
- All 101 tests pass, both type checks clean, build succeeds
- Bundle: 17 KB -> 16.11 KB
