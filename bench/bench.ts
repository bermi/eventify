import Eventify from "../src/index.ts";

const WARMUP = Number(process.env.WARMUP ?? 2);
const SAMPLES = Number(process.env.SAMPLES ?? 5);
const ITERS = Number(process.env.ITERS ?? 50_000);
const SMALL = Number(process.env.SMALL ?? 10);
const MEDIUM = Number(process.env.MEDIUM ?? 100);

const now = () => performance.now();

type BenchCase = {
  name: string;
  ops: number;
  fn: () => void;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function runCase({ name, ops, fn }: BenchCase): void {
  for (let i = 0; i < WARMUP; i += 1) {
    fn();
  }
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const start = now();
    fn();
    samples.push(now() - start);
  }
  const med = median(samples);
  const opsPerSec = (ops / med) * 1000;
  const opsPerSecStr = Math.round(opsPerSec).toLocaleString("en-US");
  const medStr = med.toFixed(3).padStart(8, " ");
  console.log(`${name.padEnd(38)} ${medStr} ms  ${opsPerSecStr} ops/s`);
}

function makeCases(): BenchCase[] {
  const cases: BenchCase[] = [];

  cases.push({
    name: "trigger (no listeners)",
    ops: ITERS,
    fn: () => {
      const emitter = Eventify.create();
      for (let i = 0; i < ITERS; i += 1) {
        emitter.trigger("tick");
      }
    },
  });

  cases.push({
    name: "trigger (1 listener)",
    ops: ITERS,
    fn: () => {
      const emitter = Eventify.create();
      emitter.on("tick", () => {});
      for (let i = 0; i < ITERS; i += 1) {
        emitter.trigger("tick");
      }
    },
  });

  cases.push({
    name: "trigger (10 listeners)",
    ops: ITERS,
    fn: () => {
      const emitter = Eventify.create();
      for (let i = 0; i < SMALL; i += 1) {
        emitter.on("tick", () => {});
      }
      for (let i = 0; i < ITERS; i += 1) {
        emitter.trigger("tick");
      }
    },
  });

  cases.push({
    name: "trigger (all listener)",
    ops: ITERS,
    fn: () => {
      const emitter = Eventify.create();
      emitter.on("all", () => {});
      for (let i = 0; i < ITERS; i += 1) {
        emitter.trigger("tick", i);
      }
    },
  });

  cases.push({
    name: "trigger (pattern match)",
    ops: ITERS,
    fn: () => {
      const emitter = Eventify.create();
      for (let i = 0; i < SMALL; i += 1) {
        emitter.on(`/ns/${i}/*`, () => {});
      }
      for (let i = 0; i < ITERS; i += 1) {
        emitter.trigger(`/ns/${i % SMALL}/value`);
      }
    },
  });

  cases.push({
    name: "on/off (100 listeners)",
    ops: MEDIUM * 2,
    fn: () => {
      const emitter = Eventify.create();
      const callbacks: Array<() => void> = [];
      for (let i = 0; i < MEDIUM; i += 1) {
        const cb = () => {};
        callbacks.push(cb);
        emitter.on("tick", cb);
      }
      for (const cb of callbacks) {
        emitter.off("tick", cb);
      }
    },
  });

  cases.push({
    name: "listenTo/stopListening",
    ops: MEDIUM,
    fn: () => {
      const a = Eventify.enable({});
      const b = Eventify.enable({});
      for (let i = 0; i < MEDIUM; i += 1) {
        a.listenTo(b, "tick", () => {});
        b.trigger("tick");
        a.stopListening();
      }
    },
  });

  // Async iteration is intentionally omitted from the synchronous microbench.

  return cases;
}

function logHeader(): void {
  const bunVersion = typeof Bun !== "undefined" ? Bun.version : "unknown";
  console.log("Eventify microbench");
  console.log(`Bun ${bunVersion}`);
  console.log(`samples=${SAMPLES} warmup=${WARMUP} iters=${ITERS}`);
  console.log("");
}

logHeader();
for (const benchCase of makeCases()) {
  runCase(benchCase);
}
