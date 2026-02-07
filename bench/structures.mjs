import {
  envNumber,
  now,
  median,
  formatCase,
  runtimeLabel,
  isCliEntry,
} from "./utils.mjs";

const DEFAULTS = {
  WARMUP: 2,
  SAMPLES: 5,
  ITERS: 100_000,
  KEYS: 1_000,
};

function mapCase(iters, keys) {
  const map = new Map();
  for (let i = 0; i < keys; i += 1) {
    map.set(`k${i}`, i);
  }
  for (let i = 0; i < iters; i += 1) {
    const key = `k${i % keys}`;
    map.set(key, i);
    map.get(key);
    map.delete(key);
  }
}

function objectCase(iters, keys) {
  const obj = Object.create(null);
  for (let i = 0; i < keys; i += 1) {
    obj[`k${i}`] = i;
  }
  for (let i = 0; i < iters; i += 1) {
    const key = `k${i % keys}`;
    obj[key] = i;
    void obj[key];
    delete obj[key];
  }
}

export function runStructuresBench(overrides = {}) {
  const config = {
    warmup: envNumber("WARMUP", DEFAULTS.WARMUP),
    samples: envNumber("SAMPLES", DEFAULTS.SAMPLES),
    iters: envNumber("ITERS", DEFAULTS.ITERS),
    keys: envNumber("KEYS", DEFAULTS.KEYS),
    ...overrides,
  };

  const cases = [];
  const { warmup, samples, iters, keys } = config;

  const runCase = (name, ops, fn) => {
    for (let i = 0; i < warmup; i += 1) {
      fn();
    }
    const sampleTimes = [];
    for (let i = 0; i < samples; i += 1) {
      const start = now();
      fn();
      sampleTimes.push(now() - start);
    }
    const med = median(sampleTimes);
    cases.push({
      name,
      medianMs: med,
      opsPerSec: (ops / med) * 1000,
    });
  };

  const ops = iters * 3;
  runCase("Map", ops, () => mapCase(iters, keys));
  runCase("Object", ops, () => objectCase(iters, keys));

  return {
    title: "Structure microbench",
    runtime: runtimeLabel(),
    config,
    cases,
  };
}

export function formatStructuresBench(result) {
  const lines = [];
  lines.push(result.title);
  lines.push(result.runtime);
  lines.push(
    `samples=${result.config.samples} warmup=${result.config.warmup} iters=${result.config.iters} keys=${result.config.keys}`,
  );
  lines.push("");
  for (const row of result.cases) {
    lines.push(formatCase(row));
  }
  return lines;
}

if (
  isCliEntry(
    typeof process !== "undefined" ? process.argv : null,
    "bench/structures.mjs",
  )
) {
  const result = runStructuresBench();
  for (const line of formatStructuresBench(result)) {
    console.log(line);
  }
}
