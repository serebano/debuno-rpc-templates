// deno-lint-ignore-file no-explicit-any
import { computed, signal, type Signal } from "@preact/signals"
import { RPCClient, type RPCEvent, type RPCEventListener, type RPCEventNames } from "./RPCClient.ts";
import { RPCFile, RPCFiles } from './RPCFiles.ts'
import { debounce } from "./utils.ts";

connect.e = new EventTarget
connect.eventNames = [] as string[]
connect.eventListeners = [] as ((event: RPCEvent) => void)[]
connect.offAll = () => {
    connect.onAll = undefined
    for (const listener of connect.eventListeners as any) {
        connect.e.removeEventListener(listener.type, listener.fn)
    }
    connect.eventListeners = []
}
connect.on = (type: RPCEventNames, listener: (event: RPCEvent) => void) => {
    connect.eventNames.push(type)
    const fn = (e: any) => listener(e.data as RPCEvent)
    Object.assign(listener, { fn, type })
    connect.eventListeners.push(listener)
    return type === '*'
        ? (connect.onAll = listener) && (() => connect.onAll = undefined)
        : connect.e.addEventListener(type, fn)
}
connect.off = (type: Exclude<RPCEventNames, '*'>, listener: (event: MessageEvent | Event) => void) => {
    // @ts-ignore .
    const fn = listener.fn
    return connect.e.removeEventListener(type, fn)
}
connect.emit = (type: Exclude<RPCEventNames, '*'>, data?: any) => connect.e.dispatchEvent(data ? new MessageEvent(type, { data }) : new Event(type))
connect.onAll = undefined as ((e: RPCEvent) => void) | undefined

const disposeFuncs = [] as (() => void)[]
connect.disposeFuncs = disposeFuncs

const instances = signal<RPCClient[]>([...RPCClient.instances.values()])

const files = computed(() => {
    let files: RPCFile[] = [];
    for (const instance of instances.value) {
        files = [...files, ...connect.filesMap.get(instance)!.value];
    }
    return files
})

const file = signal<RPCFile>()

connect.instances = instances
connect.files = files
connect.file = file
connect.close = RPCClient.close
connect.parse = RPCClient.parse
connect.resolve = RPCClient.resolve
connect.filesMap = new WeakMap<RPCClient, Signal<RPCFile[]>>()
connect.history = signal<string[]>(JSON.parse(localStorage.getItem('endpoints') || '[]'))
connect.url = signal(location.hash.slice(1))
connect.restore = async () => {
    const endpoints = connect.history.peek()
    for (const endpoint of endpoints) {
        await connect(endpoint).ready
    }
    const lastUrl = localStorage.getItem("rpc:url");
    if (lastUrl) {
        location.hash = lastUrl;
    }
}


connect.init = () => {

    const setHistory = debounce(() => {
        connect.history.value = JSON.parse(
            localStorage.getItem("endpoints") || "[]",
        );
    }, 100);

    connect.on("open", (e) => {
        localStorage.setItem(
            "endpoints",
            JSON.stringify([
                ...new Set([
                    ...JSON.parse(localStorage.getItem("endpoints") || "[]"),
                    e.target.endpoint,
                ]),
            ]),
        );
        setHistory();
    });

    connect.on("close", (e) => {
        const reason = e.data;
        if (reason === "INSTANCE_STOPPED" || reason === "RESOLVE_FAILED") {
            localStorage.setItem(
                "endpoints",
                JSON.stringify(
                    JSON.parse(localStorage.getItem("endpoints") || "[]").filter((
                        value: string,
                    ) => value !== e.target.endpoint),
                ),
            );
            setHistory();
        }
    });

    // connect.on("file:add", (e) => location.hash = e.data.http);
    // connect.on("file:change", (e) => location.hash = e.data.http);
    // connect.on("file:select", (e) => location.hash = e.data.http);



    const onHashChange = () => {
        const currentUrl = location.hash.slice(1)
        if (connect.url.value !== currentUrl)
            connect.url.value = currentUrl
    }
    addEventListener("hashchange", onHashChange);
    disposeFuncs.push(() => removeEventListener("hashchange", onHashChange))

    disposeFuncs.push(connect.url.subscribe(url => {
        const currentUrl = location.hash.slice(1)
        if (url !== currentUrl) {
            location.hash = url
        }
    }))

    disposeFuncs.push(
        connect.url.subscribe((url) => {
            console.warn(`url => ${url}`);
            if (url) {
                localStorage.setItem("rpc:url", url);
                connect(url);
            } else {
                file.value = undefined;
            }
        }),
        instances.subscribe((instances) => {
            if (!instances.length) {
                location.hash = "";
            }
        }),
    );

    connect.disposeFuncs.push(connect.offAll)

    return connect.dispose

}

connect.dispose = () => {
    const fns = disposeFuncs.splice(0, disposeFuncs.length)
    for (const fn of fns) {
        fn()
    }
}

function connect(input: number | string): RPCClient {
    return new RPCClient(input, {
        onCreated(instance) {
            instance.on('*', (e) => {
                connect.emit(e.type.replace('rpc:', '') as any, e)
                connect.onAll?.(e)
            })

            connect.filesMap.set(instance, signal([]))
            connect.instances.value = [...RPCClient.instances.values()]

            instance.on('open', () => {
                connect.instances.value = [...RPCClient.instances.values()]
            })

            instance.on('error', () => {
                connect.instances.value = [...RPCClient.instances.values()]
            })

            instance.on("close", () => {
                connect.instances.value = [...RPCClient.instances.values()]
                connect.filesMap.delete(instance)

                if (connect.file.value?.http.startsWith(instance.url))
                    connect.file.value = undefined
            });


            instance.on("files", () => {
                const filesSignal = connect.filesMap.get(instance)!
                const filesArray = [...instance.files.values()]

                filesSignal.value = filesArray
            });

            instance.on("endpoints", (e) => {
                const endpoints = e.data
                for (const endpoint of endpoints) {
                    connect(endpoint)
                }
            });

            instance.on('update', () => {
                instances.value = [...RPCClient.instances.values()]
            })

            const fetchFile: RPCEventListener<RPCFile> = async (e) => {
                connect.file.value = await e.data.fetch()
                location.hash = e.data.http
            }

            instance.on('file:add', fetchFile)
            instance.on('file:change', fetchFile)
            instance.on('file:select', fetchFile)
            instance.on('file:remove', (e) => {
                const file = e.data
                if (connect.file.value?.http === file.http) {
                    location.hash = file.endpoint;
                    connect.file.value = undefined
                }
            })
            instance.on('file:error', e => {
                connect.file.value = e.data
            })


        }
    });
}


Object.assign(globalThis, { connect, RPCClient, RPCFile, RPCFiles, instances, files })

export { connect, instances, files }