const WARMUP = Number(process.env.WARMUP ?? 2);
const SAMPLES = Number(process.env.SAMPLES ?? 5);
const PATTERNS = Number(process.env.PATTERNS ?? 300);
const EVENTS = Number(process.env.EVENTS ?? 900);

const DELIM = "/";
const WILDCARD = "*";

const now = () => performance.now();

type SegmentPattern = {
  segments: string[];
  trailingWildcard: boolean;
};

type PrefixPattern = {
  prefix: string;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function runCase(name: string, ops: number, fn: () => number): void {
  for (let i = 0; i < WARMUP; i += 1) {
    fn();
  }
  const samples: number[] = [];
  let sink = 0;
  for (let i = 0; i < SAMPLES; i += 1) {
    const start = now();
    sink = fn();
    samples.push(now() - start);
  }
  if (sink === -1) {
    console.log("sink", sink);
  }
  const med = median(samples);
  const opsPerSec = (ops / med) * 1000;
  console.log(`${name.padEnd(26)} ${med.toFixed(3).padStart(8, " ")} ms  ${Math.round(opsPerSec).toLocaleString("en-US")} ops/s`);
}

function splitName(name: string): string[] {
  return name.split(DELIM);
}

function matchesSegments(entry: SegmentPattern, eventSegments: string[]): boolean {
  const patternSegments = entry.segments;
  const patternLength = patternSegments.length;
  const eventLength = eventSegments.length;

  if (entry.trailingWildcard) {
    if (eventLength < patternLength) {
      return false;
    }
  } else if (eventLength !== patternLength) {
    return false;
  }

  const lastIndex = entry.trailingWildcard ? patternLength - 1 : patternLength;
  for (let i = 0; i < lastIndex; i += 1) {
    const segment = patternSegments[i];
    if (segment === WILDCARD) {
      continue;
    }
    if (segment !== eventSegments[i]) {
      return false;
    }
  }

  return true;
}

function matchesSplit(pattern: string, event: string): boolean {
  const segments = splitName(pattern);
  const trailingWildcard = segments[segments.length - 1] === WILDCARD;
  return matchesSegments({ segments, trailingWildcard }, splitName(event));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegex(pattern: string): RegExp {
  const segments = splitName(pattern);
  const trailingWildcard = segments[segments.length - 1] === WILDCARD;
  const lastIndex = trailingWildcard ? segments.length - 1 : segments.length;
  const parts: string[] = [];

  for (let i = 0; i < lastIndex; i += 1) {
    if (i > 0) {
      parts.push(escapeRegex(DELIM));
    }
    const segment = segments[i];
    if (segment === WILDCARD) {
      parts.push(`[^${escapeRegex(DELIM)}]+`);
    } else {
      parts.push(escapeRegex(segment));
    }
  }

  if (trailingWildcard) {
    parts.push(`(?:${escapeRegex(DELIM)}[^${escapeRegex(DELIM)}]+)+`);
  }

  return new RegExp(`^${parts.join("")}$`);
}

function hasOnlyTrailingWildcard(pattern: string): boolean {
  const segments = splitName(pattern);
  if (segments[segments.length - 1] !== WILDCARD) {
    return false;
  }
  for (let i = 0; i < segments.length - 1; i += 1) {
    if (segments[i] === WILDCARD) {
      return false;
    }
  }
  return true;
}

function buildMixedPatterns(count: number): string[] {
  const patterns: string[] = [];
  for (let i = 0; i < count; i += 1) {
    if (i % 2 === 0) {
      patterns.push(`/product/${i}/org/*/user/${i}/account/*`);
    } else {
      patterns.push(`/product/*/org/${i}/user/*/account/${i}`);
    }
  }
  return patterns;
}

function buildTrailingPatterns(count: number): string[] {
  const patterns: string[] = [];
  for (let i = 0; i < count; i += 1) {
    patterns.push(`/product/${i}/org/${i}/user/${i}/*`);
  }
  return patterns;
}

function materializeEvent(pattern: string, seed: number): string {
  const segments = splitName(pattern).map((segment) =>
    segment === WILDCARD ? `seg${seed}` : segment
  );
  return segments.join(DELIM);
}

function buildEvents(patterns: string[], count: number): string[] {
  const events: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const pattern = patterns[i % patterns.length];
    events.push(materializeEvent(pattern, i));
  }
  return events;
}

function buildSegmentPatterns(patterns: string[]): SegmentPattern[] {
  return patterns.map((pattern) => {
    const segments = splitName(pattern);
    return {
      segments,
      trailingWildcard: segments[segments.length - 1] === WILDCARD,
    };
  });
}

function buildPrefixPatterns(patterns: string[]): PrefixPattern[] {
  return patterns
    .filter((pattern) => hasOnlyTrailingWildcard(pattern))
    .map((pattern) => ({
      prefix: pattern.slice(0, -WILDCARD.length),
    }));
}

function runSegments(patterns: SegmentPattern[], events: string[]): number {
  let matches = 0;
  for (const event of events) {
    const eventSegments = splitName(event);
    for (const entry of patterns) {
      if (matchesSegments(entry, eventSegments)) {
        matches += 1;
      }
    }
  }
  return matches;
}

function runSplit(patterns: string[], events: string[]): number {
  let matches = 0;
  for (const event of events) {
    for (const pattern of patterns) {
      if (matchesSplit(pattern, event)) {
        matches += 1;
      }
    }
  }
  return matches;
}

function runRegex(patterns: RegExp[], events: string[]): number {
  let matches = 0;
  for (const event of events) {
    for (const pattern of patterns) {
      if (pattern.test(event)) {
        matches += 1;
      }
    }
  }
  return matches;
}

function runPrefix(patterns: PrefixPattern[], events: string[]): number {
  let matches = 0;
  for (const event of events) {
    for (const pattern of patterns) {
      if (event.startsWith(pattern.prefix)) {
        matches += 1;
      }
    }
  }
  return matches;
}

function logHeader(): void {
  const bunVersion = typeof Bun !== "undefined" ? Bun.version : "unknown";
  console.log("Pattern matching microbench");
  console.log(`Bun ${bunVersion}`);
  console.log(`samples=${SAMPLES} warmup=${WARMUP} patterns=${PATTERNS} events=${EVENTS}`);
  console.log("");
}

function runSuite(name: string, patterns: string[], events: string[], allowPrefix: boolean): void {
  console.log(`Suite: ${name}`);
  const ops = patterns.length * events.length;
  const segmentPatterns = buildSegmentPatterns(patterns);
  const regexPatterns = patterns.map(patternToRegex);

  runCase("segments (precomputed)", ops, () => runSegments(segmentPatterns, events));
  runCase("split per match", ops, () => runSplit(patterns, events));
  runCase("regex (compiled)", ops, () => runRegex(regexPatterns, events));

  if (allowPrefix) {
    const prefixPatterns = buildPrefixPatterns(patterns);
    const prefixOps = prefixPatterns.length * events.length;
    runCase("prefix (trailing *)", prefixOps, () => runPrefix(prefixPatterns, events));
  }
  console.log("");
}

logHeader();

const mixedPatterns = buildMixedPatterns(PATTERNS);
const mixedEvents = buildEvents(mixedPatterns, EVENTS);
runSuite("mixed wildcards", mixedPatterns, mixedEvents, false);

const trailingPatterns = buildTrailingPatterns(PATTERNS);
const trailingEvents = buildEvents(trailingPatterns, EVENTS);
runSuite("trailing wildcard only", trailingPatterns, trailingEvents, true);
