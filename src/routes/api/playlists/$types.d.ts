import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type RouteId = '/api/playlists';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
type EnsureDefined<T> = T extends void ? {} : T;
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type PageServerParentData = {};
type LayoutRouteId = never;
type LayoutParams = RouteParams;
type LayoutServerParentData = {};

export type RequestEvent = Kit.RequestEvent<RouteParams, RouteId>;
export type RequestHandler = Kit.RequestHandler<RouteParams, RouteId>;
export type ServerLoadEvent = Kit.ServerLoadEvent<RouteParams, PageServerParentData, RouteId>;
export type PageServerLoadEvent = Kit.ServerLoadEvent<RouteParams, PageServerParentData, RouteId>;
export type PageServerLoad = Kit.ServerLoad<RouteParams, PageServerParentData, MaybeWithVoid<App.PageData>, RouteId>;
export type EntryGenerator = Kit.EntryGenerator<RouteParams>;
export type Actions = Kit.Actions<RouteParams>;
export type ActionFailure<T extends Record<string, unknown> | undefined = undefined> = Kit.ActionFailure<T>;
export type Action<T extends Record<string, unknown> | undefined = undefined> = Kit.Action<RouteParams, T, RouteId>;