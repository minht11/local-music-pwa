import { assign } from "$lib/helpers/utils/assign.ts"
import { untrack } from "svelte"
import { type DatabaseChangeRecordList, listenForDatabaseChanges } from "../channel.ts"

export type QueryStatus = 'loading' | 'loaded' | 'error'

type QueryBaseState = {
    status: QueryStatus
}

type QueryLoadedState<Result> = {
    status: 'loaded'
    loading: false
    value: Result
    error: undefined
}

type QueryLoadingState<Result, InitialResult extends Result | undefined> = {
    status: 'loading'
    loading: true
    value: Result | InitialResult
    error: undefined
}

type QueryErrorState<Result, InitialResult extends Result | undefined> = {
    status: 'error'
    loading: false
    value: Result | InitialResult
    error: unknown
}

export type QueryState<Result, InitialResult extends Result | undefined> = QueryBaseState &
    (
        | QueryLoadedState<Result>
        | QueryLoadingState<Result, InitialResult>
        | QueryErrorState<Result, InitialResult>
    )

export type QueryMutate<Result, InitialResult extends Result | undefined> = (
    value: Result | ((prev: Result | InitialResult) => void),
) => void

export type DbChangeActions<Result, InitialResult extends Result | undefined> = {
    mutate: QueryMutate<Result, InitialResult>
    refetch: () => void
}

export type DatabaseChangeHandler<Result, InitialResult extends Result | undefined = undefined> = (
    changes: DatabaseChangeRecordList,
    actions: DbChangeActions<Result, InitialResult>,
) => void

export type QueryKeyPrimitiveValue = number | string | boolean
export type QueryKey = QueryKeyPrimitiveValue | QueryKeyPrimitiveValue[]

const normalizeKey = <const K extends QueryKey>(key: K) => JSON.stringify(key)

export interface QueryOptions<
    K extends QueryKey,
    Result,
    InitialResult extends Result | undefined,
> {
    key: K | (() => K)
    fetcher: (key: K) => Promise<Result> | Result
    onError?: (error: unknown) => void
    initialValue?: InitialResult
    onDatabaseChange?: DatabaseChangeHandler<Result, InitialResult>
    eager?: boolean
}

export type QueryStateInternal<Result, InitialResult extends Result | undefined> = Omit<
    QueryState<Result, InitialResult>,
    'loading'
> & {
    resolvedKey: string | undefined
}

export class QueryImpl<K extends QueryKey, Result, InitialResult extends Result | undefined> {
    /** Marks if database and key listeners initialized */
    listenersInitialized = false

    // biome-ignore lint/style/noNonNullAssertion: assignment is done in constructor
    state: QueryStateInternal<Result, InitialResult> = $state()!

    options: QueryOptions<K, Result, InitialResult>

    constructor(options: QueryOptions<K, Result, InitialResult>) {
        this.options = options
        const value = options.initialValue

        const resolvedState: QueryStateInternal<Result, InitialResult> =
            value !== undefined
                ? this.#getLoadedState(value, normalizeKey(this.#getKey()))
                : {
                        status: 'loading',
                        error: undefined,
                        value: undefined as InitialResult,
                        resolvedKey: undefined,
                    }

        this.state = resolvedState
    }

    #getKey() {
        const key = this.options.key

        return typeof key === 'function' ? key() : key
    }

    #getLoadedState(value: Result, resolvedKey: string): QueryStateInternal<Result, InitialResult> {
        return {
            status: 'loaded',
            value,
            error: undefined,
            resolvedKey,
        }
    }

    #setErrorState = (e: unknown, normalizedKey: string) => {
        assign(this.state, {
            status: 'error',
            value: undefined,
            error: e,
            resolvedKey: normalizedKey,
        })
        this.options.onError?.(e)
    }

    #setLoadedState = (value: Result, normalizedKey: string) => {
        assign(this.state, this.#getLoadedState(value, normalizedKey))
    }

    #load = (key: K, normalizedKey: string) => {
        const state = this.state

        try {
            const result = this.options.fetcher(key)

            if (result instanceof Promise) {
                result
                    .then((value) => {
                        // We only need to set loading state if it is async
                        assign(state, {
                            status: 'loading',
                            error: undefined,
                            resolvedKey: normalizedKey,
                        })

                        this.#setLoadedState(value, normalizedKey)
                    })
                    .catch((e) => {
                        this.#setErrorState(e, normalizedKey)
                    })
            } else {
                this.#setLoadedState(result, normalizedKey)
            }
        } catch (e) {
            this.#setErrorState(e, normalizedKey)
        }
    }

    load = (): void => {
        const key = this.#getKey()
        const normalizedKey = normalizeKey(key)

        this.#load(key, normalizedKey)
    }

    setupListeners(): void {
        this.listenersInitialized = true

        const { options } = this

        $effect(() => {
            const key = this.#getKey()
            const normalizedKey = normalizeKey(key)

            untrack(() => {
                if (this.state.resolvedKey === normalizedKey) {
                    return
                }

                this.#load(key, normalizedKey)
            })
        })

        $effect(() => {
            const stopListening = untrack(() =>
                listenForDatabaseChanges((changes) => {
                    options.onDatabaseChange?.(changes, {
                        mutate: (v) => {
                            let value: Result | InitialResult = this.options
                                .initialValue as InitialResult
                            if (typeof v === 'function') {
                                const accessor = v as (prev: Result | undefined) => Result
                                value = accessor(this.state.value)
                            }

                            this.state.value = value
                            this.state.resolvedKey = normalizeKey(this.#getKey())
                        },
                        refetch: () => this.load(),
                    })
                }),
            )
            return () => {
                this.listenersInitialized = false
                stopListening()
            }
        })
    }
}

export class QueryResult<Result, InitialResult extends Result | undefined> {
    #state: QueryStateInternal<Result, InitialResult>

    constructor(state: QueryStateInternal<Result, InitialResult>) {
        this.#state = state
    }

    get value() {
        return this.#state.value
    }

    get error() {
        return this.#state.error
    }

    get status() {
        return this.#state.status
    }

    get loading() {
        return this.#state.status === 'loading'
    }

    get key() {
        return this.#state.resolvedKey
    }
}

export type QueryListOptions<K extends QueryKey> = Omit<
	QueryOptions<K, number[], undefined>,
	'onDatabaseChange'
>