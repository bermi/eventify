import { createEmitter } from "../src/index";
import type { EventHandler, EventsFromSchemas, PayloadArgs } from "../src/index";
import { z } from "zod";

type Events = {
  ready: void;
  data: [string, number];
  count: number;
};

const emitter = createEmitter<Events>();
emitter.on("ready", () => {});
emitter.on("count", (value) => {
  value.toFixed(2);
});
emitter.on("data", (name, count) => {
  name.toUpperCase();
  count.toFixed(2);
});
emitter.trigger("ready");
emitter.trigger("count", 2);
emitter.trigger("data", "hello", 1);

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type DataArgs = PayloadArgs<Events["data"]>;
type CountArgs = PayloadArgs<Events["count"]>;
type ReadyArgs = PayloadArgs<Events["ready"]>;
type _assertDataArgs = Expect<Equal<DataArgs, [string, number]>>;
type _assertCountArgs = Expect<Equal<CountArgs, [number]>>;
type _assertReadyArgs = Expect<Equal<ReadyArgs, []>>;

const okCountHandler: EventHandler<Events["count"]> = (value) => {
  value.toFixed(1);
};
// @ts-expect-error - wrong handler type
const badCountHandler: EventHandler<Events["count"]> = (value: string) => value;

emitter.on("count", okCountHandler);

const schemas = {
  user: {
    parse: (_value: unknown) => ({ id: "ok" as string }),
  },
  coords: {
    parse: (_value: unknown) => [1, 2] as [number, number],
  },
  ready: {
    parse: () => undefined,
  },
};

type SchemaEvents = EventsFromSchemas<typeof schemas>;
type _assertUser = Expect<Equal<SchemaEvents["user"], { id: string }>>;
type _assertCoords = Expect<Equal<SchemaEvents["coords"], [number, number]>>;
type _assertReady = Expect<Equal<SchemaEvents["ready"], undefined>>;

const schemaEmitter = createEmitter({ schemas });

schemaEmitter.on("user", (value) => {
  value.id.toUpperCase();
});
schemaEmitter.on("coords", (x, y) => {
  x.toFixed(1);
  y.toFixed(1);
});
schemaEmitter.on("ready", () => {});

schemaEmitter.trigger("user", { id: "ok" });
schemaEmitter.trigger("coords", 1, 2);
schemaEmitter.trigger("ready");

const okUserHandler: EventHandler<SchemaEvents["user"]> = (value) => value.id;
// @ts-expect-error - wrong handler type
const badUserHandler: EventHandler<SchemaEvents["user"]> = (value: number) => value;

schemaEmitter.on("user", okUserHandler);

const zodSchemas = {
  user: z.object({ id: z.string() }),
  coords: z.tuple([z.number(), z.number()]),
  ready: z.undefined(),
};

type ZodEvents = EventsFromSchemas<typeof zodSchemas>;
type _assertZodUser = Expect<Equal<ZodEvents["user"], { id: string }>>;
type _assertZodCoords = Expect<Equal<ZodEvents["coords"], [number, number]>>;
type _assertZodReady = Expect<Equal<ZodEvents["ready"], undefined>>;

const zodEmitter = createEmitter({ schemas: zodSchemas });

zodEmitter.on("user", (value) => {
  value.id.toUpperCase();
});
zodEmitter.on("coords", (x, y) => {
  x.toFixed(1);
  y.toFixed(1);
});
zodEmitter.on("ready", () => {});
