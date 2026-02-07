export type EventMap = Record<string, unknown>;
export type PayloadArgs<T> = [T] extends [void] ? [] : [T] extends [undefined] ? [] : T extends readonly unknown[] ? T : [T];
export type PayloadValue<T> = T extends readonly unknown[] ? T : T;
export type EventName<Events extends EventMap> = Extract<keyof Events, string>;
export type EventHandler<T> = (...args: PayloadArgs<T>) => unknown;
export type AllHandler<Events extends EventMap> = (event: EventName<Events>, ...args: unknown[]) => unknown;
export type EventHandlerMap<Events extends EventMap> = {
    [K in keyof Events]?: EventHandler<Events[K]>;
};
export type SchemaLike<T = unknown> = {
    parse: (input: unknown) => T;
} | {
    safeParse: (input: unknown) => {
        success: true;
        data: T;
    } | {
        success: false;
        error: unknown;
    };
};
export type SchemaMap = Record<string, SchemaLike>;
export type InferSchema<S> = S extends {
    parse: (input: unknown) => infer T;
} ? T : S extends {
    safeParse: (input: unknown) => {
        success: true;
        data: infer T;
    };
} ? T : unknown;
export type EventsFromSchemas<TSchemas> = TSchemas extends SchemaMap ? {
    [K in keyof TSchemas]: InferSchema<TSchemas[K]>;
} : EventMap;
export type ValidationMeta = {
    event: string;
};
export type SchemaValidator<TSchema extends SchemaLike = SchemaLike> = (schema: TSchema, payload: unknown, meta: ValidationMeta) => unknown;
export type ErrorMeta<Events extends EventMap> = {
    event: EventName<Events> | string;
    args: unknown[];
    listener?: (...args: unknown[]) => unknown;
    emitter: object;
};
export type ErrorHandler<Events extends EventMap> = (error: unknown, meta: ErrorMeta<Events>) => void;
export type EventifyOptions<TSchemas extends SchemaMap | undefined = undefined, TEvents extends EventMap = EventMap> = {
    schemas?: TSchemas;
    validate?: SchemaValidator;
    onError?: ErrorHandler<TEvents>;
    namespaceDelimiter?: string;
    wildcard?: string;
};
export type IterateOptions = {
    signal?: AbortSignal;
};
export interface EventifyEmitter<Events extends EventMap = EventMap> {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
    dispatchEvent(event: Event): boolean;
    on<K extends EventName<Events>>(name: K, callback: EventHandler<Events[K]>, context?: unknown): this;
    on(name: "all", callback: AllHandler<Events>, context?: unknown): this;
    on(name: EventHandlerMap<Events>, context?: unknown): this;
    on(name: string, callback?: (...args: unknown[]) => unknown, context?: unknown): this;
    once<K extends EventName<Events>>(name: K, callback: EventHandler<Events[K]>, context?: unknown): this;
    once(name: "all", callback: AllHandler<Events>, context?: unknown): this;
    once(name: EventHandlerMap<Events>, context?: unknown): this;
    once(name: string, callback?: (...args: unknown[]) => unknown, context?: unknown): this;
    off(): this;
    off<K extends EventName<Events>>(name: K, callback?: EventHandler<Events[K]> | null, context?: unknown): this;
    off(name: EventHandlerMap<Events>, context?: unknown): this;
    off(name?: string | null, callback?: ((...args: unknown[]) => unknown) | null, context?: unknown): this;
    trigger<K extends EventName<Events>>(name: K, ...args: PayloadArgs<Events[K]>): this;
    trigger(name: string, ...args: unknown[]): this;
    emit<K extends EventName<Events>>(name: K, ...args: PayloadArgs<Events[K]>): this;
    emit(name: string, ...args: unknown[]): this;
    produce<K extends EventName<Events>>(name: K, ...args: PayloadArgs<Events[K]>): this;
    produce(name: string, ...args: unknown[]): this;
    listenTo<OtherEvents extends EventMap, K extends EventName<OtherEvents>>(other: EventifyEmitter<OtherEvents>, name: K, callback: EventHandler<OtherEvents[K]>): this;
    listenTo<OtherEvents extends EventMap>(other: EventifyEmitter<OtherEvents>, name: EventHandlerMap<OtherEvents>): this;
    listenTo(other: EventifyEmitter<EventMap>, name: string, callback?: (...args: unknown[]) => unknown): this;
    listenToOnce<OtherEvents extends EventMap, K extends EventName<OtherEvents>>(other: EventifyEmitter<OtherEvents>, name: K, callback: EventHandler<OtherEvents[K]>): this;
    listenToOnce<OtherEvents extends EventMap>(other: EventifyEmitter<OtherEvents>, name: EventHandlerMap<OtherEvents>): this;
    listenToOnce(other: EventifyEmitter<EventMap>, name: string, callback?: (...args: unknown[]) => unknown): this;
    stopListening<OtherEvents extends EventMap>(other?: EventifyEmitter<OtherEvents> | null, name?: EventName<OtherEvents> | EventHandlerMap<OtherEvents> | null, callback?: ((...args: unknown[]) => unknown) | null): this;
    iterate<K extends EventName<Events>>(name: K, options?: IterateOptions): AsyncIterableIterator<PayloadValue<Events[K]>>;
    iterate(name: "all", options?: IterateOptions): AsyncIterableIterator<[EventName<Events>, ...unknown[]]>;
    iterate(name: string, options?: IterateOptions): AsyncIterableIterator<unknown>;
}
export interface EventifyStatic<Events extends EventMap = EventMap> extends EventifyEmitter<Events> {
    version: string;
    enable<TTarget extends object, TSchemas extends SchemaMap>(target: TTarget | undefined, options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
        schemas: TSchemas;
    }): TTarget & EventifyEmitter<EventsFromSchemas<TSchemas>>;
    enable<TTarget extends object, TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(target?: TTarget, options?: EventifyOptions<TSchemas, TEvents>): TTarget & EventifyEmitter<TEvents>;
    create<TSchemas extends SchemaMap>(options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
        schemas: TSchemas;
    }): EventifyEmitter<EventsFromSchemas<TSchemas>>;
    create<TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(options?: EventifyOptions<TSchemas, TEvents>): EventifyEmitter<TEvents>;
    mixin: EventifyStatic["enable"];
    proto: EventifyEmitter<EventMap>;
    noConflict: () => EventifyStatic<Events>;
    defaultSchemaValidator: SchemaValidator;
}
export declare function defaultSchemaValidator(schema: SchemaLike, payload: unknown, _meta: ValidationMeta): unknown;
export declare function createEventify<TSchemas extends SchemaMap>(options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
    schemas: TSchemas;
}): EventifyEmitter<EventsFromSchemas<TSchemas>>;
export declare function createEventify<TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(options?: EventifyOptions<TSchemas, TEvents>): EventifyEmitter<TEvents>;
export declare function enable<TTarget extends object, TSchemas extends SchemaMap>(target: TTarget | undefined, options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
    schemas: TSchemas;
}): TTarget & EventifyEmitter<EventsFromSchemas<TSchemas>>;
export declare function enable<TTarget extends object, TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(target?: TTarget, options?: EventifyOptions<TSchemas, TEvents>): TTarget & EventifyEmitter<TEvents>;
declare const Eventify: EventifyStatic;
declare const createEmitter: typeof createEventify;
declare const decorateWithEvents: typeof enable;
declare const setDefaultSchemaValidator: typeof defaultSchemaValidator;
export { Eventify, createEmitter, decorateWithEvents, setDefaultSchemaValidator, };
export default Eventify;
//# sourceMappingURL=index.d.ts.map