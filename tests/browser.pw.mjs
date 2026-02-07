import { test, expect } from "@playwright/test";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let server;
let baseURL;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/" || url.pathname === "/index.html") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Eventify Browser Test</title>
  </head>
  <body>
    <script type="module">
      import { createEmitter } from "/dist/index.js";
      window.__createEmitter = createEmitter;
    </script>
  </body>
</html>`);
        return;
      }

      if (url.pathname.startsWith("/dist/")) {
        const filePath = path.join(root, url.pathname);
        const normalized = path.normalize(filePath);
        const distRoot = path.join(root, "dist") + path.sep;
        if (!normalized.startsWith(distRoot)) {
          res.writeHead(403);
          res.end();
          return;
        }
        const content = await readFile(normalized);
        const ext = path.extname(normalized);
        const type = ext === ".js"
          ? "text/javascript"
          : ext === ".map"
            ? "application/json"
            : "text/plain";
        res.writeHead(200, { "content-type": type });
        res.end(content);
        return;
      }

      res.writeHead(404);
      res.end();
    } catch {
      res.writeHead(500);
      res.end();
    }
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (!server) return;
  await new Promise((resolve) => server.close(() => resolve()));
});

test("basic on/trigger", async ({ page }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => window.__createEmitter);
  const calls = await page.evaluate(() => {
    const emitter = window.__createEmitter();
    let count = 0;
    emitter.on("ping", (value) => {
      if (value === 42) count += 1;
    });
    emitter.trigger("ping", 42);
    return count;
  });
  expect(calls).toBe(1);
});

test("all listener sees event name", async ({ page }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => window.__createEmitter);
  const result = await page.evaluate(() => {
    const emitter = window.__createEmitter();
    let name;
    emitter.on("all", (eventName) => {
      name = eventName;
    });
    emitter.trigger("alpha");
    return name;
  });
  expect(result).toBe("alpha");
});

test("wildcard namespaces match", async ({ page }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => window.__createEmitter);
  const calls = await page.evaluate(() => {
    const emitter = window.__createEmitter();
    let count = 0;
    emitter.on("/product/foo/*", () => {
      count += 1;
    });
    emitter.trigger("/product/foo/org/123");
    return count;
  });
  expect(calls).toBe(1);
});

test("schemas validate in browser", async ({ page }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => window.__createEmitter);
  const result = await page.evaluate(() => {
    const schema = {
      parse: (value) => String(value).toUpperCase(),
    };
    const emitter = window.__createEmitter({
      schemas: { shout: schema },
    });
    let seen;
    emitter.on("shout", (value) => {
      seen = value;
    });
    emitter.trigger("shout", "hello");
    return seen;
  });
  expect(result).toBe("HELLO");
});

test("iterate yields values", async ({ page }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => window.__createEmitter);
  const value = await page.evaluate(async () => {
    const emitter = window.__createEmitter();
    const iterator = emitter.iterate("tick");
    emitter.trigger("tick", 1, 2);
    const result = await iterator.next();
    await iterator.return();
    return result.value;
  });
  expect(value).toEqual([1, 2]);
});
