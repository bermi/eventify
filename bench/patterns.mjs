import { envNumber, now, median, formatCase, runtimeLabel, isCliEntry } from "./utils.mjs";

const DEFAULTS = {
  WARMUP: 2,
  SAMPLES: 5,
  PATTERNS: 300,
  EVENTS: 900,
};

const DELIM = "/";
const WILDCARD = "*";

function splitName(name) {
  return name.split(DELIM);
}

function matchesSegments(entry, eventSegments) {
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

function matchesSplit(pattern, event) {
  const segments = splitName(pattern);
  const trailingWildcard = segments[segments.length - 1] === WILDCARD;
  return matchesSegments({ segments, trailingWildcard }, splitName(event));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegex(pattern) {
  const segments = splitName(pattern);
  const trailingWildcard = segments[segments.length - 1] === WILDCARD;
  const lastIndex = trailingWildcard ? segments.length - 1 : segments.length;
  const parts = [];

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

function hasOnlyTrailingWildcard(pattern) {
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

function buildMixedPatterns(count) {
  const patterns = [];
  for (let i = 0; i < count; i += 1) {
    if (i % 2 === 0) {
      patterns.push(`/product/${i}/org/*/user/${i}/account/*`);
    } else {
      patterns.push(`/product/*/org/${i}/user/*/account/${i}`);
    }
  }
  return patterns;
}

function buildTrailingPatterns(count) {
  const patterns = [];
  for (let i = 0; i < count; i += 1) {
    patterns.push(`/product/${i}/org/${i}/user/${i}/*`);
  }
  return patterns;
}

function materializeEvent(pattern, seed) {
  const segments = splitName(pattern).map((segment) =>
    segment === WILDCARD ? `seg${seed}` : segment
  );
  return segments.join(DELIM);
}

function buildEvents(patterns, count) {
  const events = [];
  for (let i = 0; i < count; i += 1) {
    const pattern = patterns[i % patterns.length];
    events.push(materializeEvent(pattern, i));
  }
  return events;
}

function buildSegmentPatterns(patterns) {
  return patterns.map((pattern) => {
    const segments = splitName(pattern);
    return {
      segments,
      trailingWildcard: segments[segments.length - 1] === WILDCARD,
    };
  });
}

function buildPrefixPatterns(patterns) {
  return patterns
    .filter((pattern) => hasOnlyTrailingWildcard(pattern))
    .map((pattern) => ({
      prefix: pattern.slice(0, -WILDCARD.length),
    }));
}

function runSegments(patterns, events) {
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

function runSplit(patterns, events) {
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

function runRegex(patterns, events) {
  const regexes = patterns.map((pattern) => patternToRegex(pattern));
  let matches = 0;
  for (const event of events) {
    for (const regex of regexes) {
      if (regex.test(event)) {
        matches += 1;
      }
    }
  }
  return matches;
}

function runPrefix(patterns, events) {
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

export function runPatternBench(overrides = {}) {
  const config = {
    warmup: envNumber("WARMUP", DEFAULTS.WARMUP),
    samples: envNumber("SAMPLES", DEFAULTS.SAMPLES),
    patterns: envNumber("PATTERNS", DEFAULTS.PATTERNS),
    events: envNumber("EVENTS", DEFAULTS.EVENTS),
    ...overrides,
  };

  const makeSuite = (name, patterns) => {
    const events = buildEvents(patterns, config.events);
    const segmentPatterns = buildSegmentPatterns(patterns);
    const prefixPatterns = buildPrefixPatterns(patterns);
    const cases = [];

    const runCase = (caseName, ops, fn) => {
      for (let i = 0; i < config.warmup; i += 1) {
        fn();
      }
      const sampleTimes = [];
      for (let i = 0; i < config.samples; i += 1) {
        const start = now();
        fn();
        sampleTimes.push(now() - start);
      }
      const med = median(sampleTimes);
      cases.push({
        name: caseName,
        medianMs: med,
        opsPerSec: (ops / med) * 1000,
      });
    };

    const ops = config.events * patterns.length;
    runCase("segments (precomputed)", ops, () => runSegments(segmentPatterns, events));
    runCase("split per match", ops, () => runSplit(patterns, events));
    runCase("regex (compiled)", ops, () => runRegex(patterns, events));
    if (prefixPatterns.length) {
      runCase("prefix (trailing *)", config.events * prefixPatterns.length, () => runPrefix(prefixPatterns, events));
    }

    return { name, cases };
  };

  return {
    title: "Pattern matching microbench",
    runtime: runtimeLabel(),
    config,
    suites: [
      makeSuite("mixed wildcards", buildMixedPatterns(config.patterns)),
      makeSuite("trailing wildcard only", buildTrailingPatterns(config.patterns)),
    ],
  };
}

export function formatPatternBench(result) {
  const lines = [];
  lines.push(result.title);
  lines.push(result.runtime);
  lines.push(`samples=${result.config.samples} warmup=${result.config.warmup} patterns=${result.config.patterns} events=${result.config.events}`);
  lines.push("");
  for (const suite of result.suites) {
    lines.push(`Suite: ${suite.name}`);
    for (const row of suite.cases) {
      lines.push(formatCase(row));
    }
    lines.push("");
  }
  return lines;
}

if (isCliEntry(typeof process !== "undefined" ? process.argv : null, "bench/patterns.mjs")) {
  const result = runPatternBench();
  for (const line of formatPatternBench(result)) {
    console.log(line);
  }
}
