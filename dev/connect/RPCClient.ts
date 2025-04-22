// deno-lint-ignore-file no-explicit-any
import { RPCFiles, type RPCFile } from "./RPCFiles.ts";
import { debounce, getHeadersSync, parseUrlLike } from "./utils.ts";

type RPCInternalEventNames = 'open' | 'close' | 'error' | 'update' | 'state' | 'files' | 'file' | 'endpoints'

type RPCFileEventNames =
	'file:add' |
	'file:change' |
	'file:fetch' |
	'file:remove' |
	'file:select' |
	'file:error'

type RPCEventNames =
	'*' |
	'created' |
	'open' |
	'close' |
	'error' |
	'update' |
	'files' |
	'endpoints' | RPCFileEventNames

type RPCEvent<T = any, D = any> = (MessageEvent<D> | Event) & {
	target: RPCClient
	currentTarget: RPCClient
	type: T
	data: D
}

type RPCEventListener<T = any> = (event: RPCEvent<RPCEventNames, T>) => void
type RPCInternalEventListener<T = any> = (event: RPCEvent<RPCInternalEventNames, T>) => void


class RPCClient extends EventSource {
	static STATE = {
		[EventSource.OPEN]: "OPEN",
		[EventSource.CLOSED]: "CLOSED",
		[EventSource.CONNECTING]: "CONNECTING",
	}
	static instances = new Map<string, RPCClient>()
	static files = new WeakMap<RPCClient, RPCFiles>()
	static parse = parseUrlLike
	static resolve(input: number | string | URL) {
		input = String(input)
		const endpoint = parseUrlLike(input)
		const headers = getHeadersSync(endpoint)

		if (!headers || !headers.has('x-endpoint')) {
			return {
				input,
				url: new URL(endpoint).href,
				endpoint,
				status: 404
			}
		}

		const entries = Object.fromEntries(headers)
		return {
			status: 200,
			input,
			url: entries['x-url'],
			root: endpoint === entries['x-endpoint'],
			base: entries['x-base'],
			path: entries['x-path'],
			host: entries['x-host'],
			port: entries['x-port'],
			runtime: entries['x-runtime'],
			endpoint: entries['x-endpoint'],
			filename: entries['x-filename'],
			hostname: entries['x-hostname'],
			protocol: entries['x-protocol']
		}
	}
	static close(endpoint?: string) {
		endpoint
			? RPCClient.instances.get(endpoint)?.close()
			: RPCClient.instances.forEach((instance) => instance.close())
	}

	#eventNames: string[] = [];
	#eventsReceived: Record<string, boolean> = {}

	path!: string;
	base!: string;
	endpoint!: string;
	filename!: string;
	runtime!: string;

	files!: RPCFiles
	file?: RPCFile
	#ready = Promise.withResolvers<RPCClient>()
	ready: Promise<RPCClient> = this.#ready.promise

	declare readyState: 0 | 1 | 2

	constructor(url: number | string | URL, eventSourceInitDict?: EventSourceInit & { onCreated?: (i: RPCClient) => void }) {

		const resolved = RPCClient.resolve(url)
		const instance = RPCClient.instances.get(resolved.endpoint)

		if (instance) {
			if (instance.readyState === RPCClient.CONNECTING ||
				instance.readyState === RPCClient.OPEN) {
				if (resolved.filename) {
					if (instance.#eventsReceived.files) {
						const file = instance.files.get(resolved.filename)
						if (file) {
							instance.emit('file:select', file)
						} else {
							instance.emit('file:error', {
								...resolved,
								error: {
									status: 404,
									message: `File "${resolved.filename} not found"`
								}
							} as any)
						}
					}
				}
				return instance
			}
			RPCClient.instances.delete(instance.endpoint);
		}

		super(resolved.endpoint, eventSourceInitDict)
		RPCClient.instances.set(resolved.endpoint, this)

		this.path = resolved.path || ''
		this.base = resolved.base || ''
		this.runtime = resolved.runtime || ''
		this.endpoint = resolved.endpoint

		const emitFiles = debounce(() => this.emit('files'), 100)

		this.files = new RPCFiles([], {
			onInit: () => this.emit('files'),
			onSet: emitFiles,
			onDelete: emitFiles,
			onClear: emitFiles,
			onFetch: emitFiles,
		})

		this.#on('open', () => {
			this.emit('open')
			this.#ready.resolve(this)
		})
		this.#on('close', () => this.emit('close'))
		this.#on("error", () => {
			this.emit("error")
			this.#ready.reject()
			if (this.readyState === RPCClient.CLOSED) {
				RPCClient.instances.delete(this.endpoint);
				this.emit('close')
			}
		})
		this.#on('update', () => this.emit('update'))
		this.#on("endpoints", e => this.emit('endpoints', e.data))
		this.#on("state", (e) => {
			const state = e.data

			if (state.state === "stopped") {
				const instance = RPCClient.instances.get(state.endpoint)
				if (instance) {
					instance.close('INSTANCE_STOPPED');
				}
				return;
			}

			if (state.state === "started") {
				if (state.endpoint !== this.endpoint)
					this.emit('endpoints', [state.endpoint])
				return;
			}

			if (state.state === "updated") {
				const instance = RPCClient.instances.get(state.endpoint)!;
				if (state.path !== instance.path) {
					instance.path = state.path;
					instance.emit('update')
				}
				return;
			}
		});
		this.#on('files', e => {
			const files = e.data
			this.files.init(files)
			if (resolved.filename) {
				const file = this.files.get(resolved.filename)
				if (file) {
					this.emit('file:select', file)
				} else {
					this.emit('file:error', {
						...resolved,
						error: {
							status: 404,
							message: `File "${resolved.filename} not found"`
						}
					} as any)
				}
			}
		})
		this.#on("file", (e) => {
			const file = e.data

			switch (file.type) {
				case "added":
					this.files.set(file.path, file)
					this.emit('file:add', this.files.get(file.path)!)
					break
				case "changed":
					this.files.set(file.path, file)
					this.emit('file:change', this.files.get(file.path)!)
					break
				case "removed":
					this.emit('file:remove', this.files.get(file.path)!)
					this.files.delete(file.path)
					break
			}
		});

		eventSourceInitDict?.onCreated?.(this)
		this.emit('created')

		if (resolved.status === 404) {
			this.close('RESOLVE_FAILED')
		}

	}

	override close(reason?: any): void {
		super.close();
		RPCClient.instances.delete(this.endpoint);
		RPCClient.files.delete(this)
		this.emit('close', reason)
	}

	#onAll?: (e: RPCEvent) => void

	on(type: '*', cb: RPCEventListener): void
	on(type: 'open', cb: RPCEventListener): void
	on(type: 'close', cb: RPCEventListener): void
	on(type: 'error', cb: RPCEventListener): void
	on(type: 'update', cb: RPCEventListener): void
	on(type: 'files', cb: RPCEventListener): void

	on(type: 'endpoints', cb: RPCEventListener<string[]>): void
	on(type: 'file:add', cb: RPCEventListener<RPCFile>): void
	on(type: 'file:change', cb: RPCEventListener<RPCFile>): void
	on(type: 'file:remove', cb: RPCEventListener<RPCFile>): void
	on(type: 'file:fetch', cb: RPCEventListener<RPCFile>): void
	on(type: 'file:select', cb: RPCEventListener<RPCFile>): void
	on(type: 'file:error', cb: RPCEventListener<RPCFile>): void

	on(type: RPCEventNames, cb: RPCEventListener) {
		if (type === '*')
			return (this.#onAll = cb) && (() => this.#onAll = undefined)

		type = `rpc:${type}` as RPCEventNames

		this.#eventNames.push(type)
		return this.addEventListener(type, (e: any) => {
			this.#eventsReceived[type] = true
			cb(e);
			this.#onAll?.(e)
		});
	}

	emit(type: 'open'): void
	emit(type: 'close', reason?: any): void
	emit(type: 'error'): void
	emit(type: 'update'): void
	emit(type: 'created'): void
	emit(type: 'files'): void

	emit(type: 'endpoints', data: string[]): void

	emit(type: 'file:add', data: RPCFile): void
	emit(type: 'file:change', data: RPCFile): void
	emit(type: 'file:remove', data: RPCFile): void
	emit(type: 'file:fetch', data: RPCFile): void
	emit(type: 'file:select', data: RPCFile): void
	emit(type: 'file:error', data: Pick<RPCFile, 'path' | 'http' | 'error'>): void

	emit(type: any, data?: any) {
		type = `rpc:${type}`
		return this.dispatchEvent(data
			? new MessageEvent(type, { data })
			: new Event(type)
		)
	}

	#on(type: 'open', cb: RPCInternalEventListener): void
	#on(type: 'close', cb: RPCInternalEventListener): void
	#on(type: 'error', cb: RPCInternalEventListener): void
	#on(type: 'update', cb: RPCInternalEventListener): void
	#on(type: 'file', cb: RPCInternalEventListener<RPCFile>): void
	#on(type: 'files', cb: RPCInternalEventListener<RPCFile[]>): void
	#on(type: 'state', cb: RPCInternalEventListener<Record<string, any>>): void
	#on(type: 'endpoints', cb: RPCInternalEventListener<string[]>): void

	#on(type: RPCInternalEventNames, cb: RPCInternalEventListener) {
		this.#eventNames.push(type)
		return this.addEventListener(type, (e: any) => {
			this.#eventsReceived[type] = true
			if (e instanceof MessageEvent && typeof e.data === 'string') {
				try {
					const data = e.data
					Object.defineProperty(e, 'data', {
						get() {
							return JSON.parse(data)
						},
						configurable: true,
						enumerable: true
					})
				} catch {
					/// ...
				}
			}
			cb(e);
		});
	}
}

export { RPCClient }
export type { RPCEventNames, RPCEvent, RPCEventListener }