// deno-lint-ignore-file no-explicit-any

interface RPCFile {
    http: string
    base: string
    path: string
    file: string
    version: null | number
    endpoint: string
    timestamp: number
    dependents: Record<string, number | null>
    dependencies: Record<string, number | null>
    type: 'added' | 'removed' | 'changed' | 'selected'
    source?: string
    error?: any
}

class RPCFile {
    static from(url: string | URL) {
        return new RPCFile({ http: String(url) } as RPCFile).fetch()
    }
    [Symbol.toStringTag] = `RPCFile(${this.http})`
    constructor(file: RPCFile) {
        Object.assign(this, file)
        this[Symbol.toStringTag] = `RPCFile(${this.http})`
    }
    async open(opts?: { line?: number, column?: number, type?: 'src' | 'gen', format?: 'ts' | 'js' }) {
        opts = opts || {}

        const url = new URL([this.http, opts.line, opts.column].filter(Boolean).join(':'))

        opts.type = opts.type || 'src'
        opts.format = opts.format || 'ts'

        url.searchParams.set(opts.type, opts.format)
        url.searchParams.set('open', '')

        return await (await fetch(url, {
            headers: {
                'x-dest': 'document'
            }
        })).text()
    }
    async fetch(init?: (file: this) => Request): Promise<this> {
        const response = await fetch(init ? init(this) : this.http + "?meta");

        if (response.ok) {
            this.error = undefined;
            Object.assign(this, await response.json());
        } else {
            this.error = {
                status: response.status,
                message: await response.text()
            };
        }
        return this
    }
}

class RPCFiles extends Map<string, RPCFile> {
    constructor(input?: RPCFile[], private hooks: {
        onInit?: (files: RPCFile[], instance: RPCFiles) => void;
        onSet?: (key: string, value: RPCFile, instance: RPCFiles) => void;
        onDelete?: (key: string, instance: RPCFiles) => void;
        onFetch?: (key: string, instance: RPCFiles) => void;
        onClear?: (instance: RPCFiles) => void;
    } = {}) {
        super(input?.map(i => [i.path, new RPCFile(i)]));
    }

    override set(key: string, value: RPCFile): this {
        value = new RPCFile(value)
        super.set(key, value);
        this.hooks.onSet?.(key, value, this);
        return this;
    }

    override clear() {
        super.clear();
        this.hooks.onClear?.(this);
    }

    override delete(key: string): boolean {
        const result = super.delete(key);
        if (result)
            this.hooks.onDelete?.(key, this);
        return result;
    }

    init(files: RPCFile[]) {
        super.clear();
        files = files.map(file => new RPCFile(file))
        for (const file of files) {
            super.set(file.path, file);
        }
        this.hooks.onInit?.(files, this);
        return this;
    }

    async fetch(key: string, requestInit?: (file: RPCFile) => Request): Promise<RPCFile | undefined> {
        const file = this.get(key);
        if (file) {
            await file.fetch(requestInit)
            this.hooks.onFetch?.(key, this);
        }
        return file;
    }
}

export { RPCFiles, RPCFile }
