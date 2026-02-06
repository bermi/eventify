const WARMUP = Number(process.env.WARMUP ?? 2);
const SAMPLES = Number(process.env.SAMPLES ?? 5);
const ITERS = Number(process.env.ITERS ?? 100_000);
const KEYS = Number(process.env.KEYS ?? 1_000);

const now = () => performance.now();

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function runCase(name: string, ops: number, fn: () => void): void {
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
  console.log(`${name.padEnd(18)} ${med.toFixed(3).padStart(8, " ")} ms  ${Math.round(opsPerSec).toLocaleString("en-US")} ops/s`);
}

function mapCase(): void {
  const map = new Map<string, number>();
  for (let i = 0; i < KEYS; i += 1) {
    map.set(`k${i}`, i);
  }
  for (let i = 0; i < ITERS; i += 1) {
    const key = `k${i % KEYS}`;
    map.set(key, i);
    map.get(key);
    map.delete(key);
  }
}

function objectCase(): void {
  const obj: Record<string, number> = Object.create(null);
  for (let i = 0; i < KEYS; i += 1) {
    obj[`k${i}`] = i;
  }
  for (let i = 0; i < ITERS; i += 1) {
    const key = `k${i % KEYS}`;
    obj[key] = i;
    void obj[key];
    delete obj[key];
  }
}

console.log("Structure microbench");
console.log(`samples=${SAMPLES} warmup=${WARMUP} iters=${ITERS} keys=${KEYS}`);
console.log("");

runCase("Map", ITERS * 3, mapCase);
runCase("Object", ITERS * 3, objectCase);
