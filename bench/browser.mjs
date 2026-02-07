import { runEventifyBench, formatEventifyBench } from "./bench.mjs";
import { runPatternBench, formatPatternBench } from "./patterns.mjs";
import { runStructuresBench, formatStructuresBench } from "./structures.mjs";

const params = new URLSearchParams(globalThis.location?.search ?? "");
const fast = params.has("fast");
const log = !params.has("quiet");

const eventifyOverrides = fast
  ? { warmup: 1, samples: 2, iters: 8_000, small: 5, medium: 30 }
  : {};
const patternOverrides = fast
  ? { warmup: 1, samples: 2, patterns: 80, events: 200 }
  : {};
const structureOverrides = fast
  ? { warmup: 1, samples: 2, iters: 30_000, keys: 200 }
  : {};

try {
  const eventify = runEventifyBench(eventifyOverrides);
  const patterns = runPatternBench(patternOverrides);
  const structures = runStructuresBench(structureOverrides);

  const results = { eventify, patterns, structures };
  globalThis.__benchResults = results;

  if (log) {
    const output = [
      ...formatEventifyBench(eventify),
      "",
      ...formatPatternBench(patterns),
      "",
      ...formatStructuresBench(structures),
    ];
    for (const line of output) {
      console.log(line);
    }
  }
} catch (error) {
  globalThis.__benchError = error instanceof Error ? error.message : String(error);
  console.error(error);
} finally {
  globalThis.__benchDone = true;
}
