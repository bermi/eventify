/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	testDir: "./tests",
	testMatch: "**/*.pw.mjs",
	fullyParallel: false,
	workers: 1,
	timeout: 30_000,
	use: {
		headless: true,
		viewport: { width: 1280, height: 720 },
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
};

export default config;
