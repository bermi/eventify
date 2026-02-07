import { createEmitter, decorateWithEvents } from "../dist/index.js";
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
	ITERS: 50_000,
	SMALL: 10,
	MEDIUM: 100,
};

export function runEventifyBench(overrides = {}) {
	const config = {
		warmup: envNumber("WARMUP", DEFAULTS.WARMUP),
		samples: envNumber("SAMPLES", DEFAULTS.SAMPLES),
		iters: envNumber("ITERS", DEFAULTS.ITERS),
		small: envNumber("SMALL", DEFAULTS.SMALL),
		medium: envNumber("MEDIUM", DEFAULTS.MEDIUM),
		...overrides,
	};

	const cases = [];
	const { warmup, samples, iters, small, medium } = config;

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

	runCase("trigger (no listeners)", iters, () => {
		const emitter = createEmitter();
		for (let i = 0; i < iters; i += 1) {
			emitter.trigger("tick");
		}
	});

	runCase("trigger (1 listener)", iters, () => {
		const emitter = createEmitter();
		emitter.on("tick", () => {});
		for (let i = 0; i < iters; i += 1) {
			emitter.trigger("tick");
		}
	});

	runCase("trigger (10 listeners)", iters, () => {
		const emitter = createEmitter();
		for (let i = 0; i < small; i += 1) {
			emitter.on("tick", () => {});
		}
		for (let i = 0; i < iters; i += 1) {
			emitter.trigger("tick");
		}
	});

	runCase("trigger (all listener)", iters, () => {
		const emitter = createEmitter();
		emitter.on("all", () => {});
		for (let i = 0; i < iters; i += 1) {
			emitter.trigger("tick", i);
		}
	});

	runCase("trigger (pattern match)", iters, () => {
		const emitter = createEmitter();
		for (let i = 0; i < small; i += 1) {
			emitter.on(`/ns/${i}/*`, () => {});
		}
		for (let i = 0; i < iters; i += 1) {
			emitter.trigger(`/ns/${i % small}/value`);
		}
	});

	runCase("on/off (100 listeners)", medium * 2, () => {
		const emitter = createEmitter();
		const callbacks = [];
		for (let i = 0; i < medium; i += 1) {
			const cb = () => {};
			callbacks.push(cb);
			emitter.on("tick", cb);
		}
		for (const cb of callbacks) {
			emitter.off("tick", cb);
		}
	});

	runCase("listenTo/stopListening", medium, () => {
		const a = decorateWithEvents({});
		const b = decorateWithEvents({});
		for (let i = 0; i < medium; i += 1) {
			a.listenTo(b, "tick", () => {});
			b.trigger("tick");
			a.stopListening();
		}
	});

	return {
		title: "Eventify microbench",
		runtime: runtimeLabel(),
		config,
		cases,
	};
}

export function formatEventifyBench(result) {
	const lines = [];
	lines.push(result.title);
	lines.push(result.runtime);
	lines.push(
		`samples=${result.config.samples} warmup=${result.config.warmup} iters=${result.config.iters}`,
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
		"bench/bench.mjs",
	)
) {
	const result = runEventifyBench();
	for (const line of formatEventifyBench(result)) {
		console.log(line);
	}
}
