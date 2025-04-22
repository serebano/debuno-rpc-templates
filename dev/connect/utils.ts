// deno-lint-ignore-file no-explicit-any prefer-const
function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: number | undefined;

    return function (...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), wait) as unknown as number;
    };
}

function getHeadersSync(url: string): Headers | null {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("HEAD", url, false); // false makes it synchronous
        xhr.send(null);
        const headers = new Headers();
        xhr.getAllResponseHeaders()
            .trim()
            .split(/[\r\n]+/)
            .forEach(line => {
                const parts = line.split(": ");
                const header = parts.shift();
                const value = parts.join(": ");
                if (header) headers.append(header, value);
            });
        return headers;
    } catch {
        // console.error("HEAD request failed:", e);
        return null;
    }
}

function parseUrlLike(input: string | number): string {
    const str = String(input).trim();
    // Handle cases like: https://8080 or http://8080/path
    const protoPortMatch = str.match(/^https?:\/\/(\d+)(\/.*)?$/);
    if (protoPortMatch) {
        const proto = str.startsWith("https") ? "https" : "http";
        const port = protoPortMatch[1];
        const path = ensureTrailingSlash(protoPortMatch[2] || "/");
        return (`${proto}://localhost:${port}${path}`);
    }
    // Full valid URL? Parse and normalize
    try {
        const url = new URL(str);
        let port = url.port
        if (!port) {
            port = url.protocol === "https:" ? "443" : "80";
        }
        const pathname = ensureTrailingSlash(url.pathname);
        return `${url.protocol}//${url.hostname}:${port}${pathname}`;
    } catch { }

    // Manual fallback parsing
    let protocol = "http";
    let hostname = "localhost";
    let port: number | undefined;
    let path = "/";

    if (/^\d+$/.test(str)) {
        port = Number(str);
    } else if (/^\d+\//.test(str)) {
        const [p, ...rest] = str.split("/");
        port = Number(p);
        path = "/" + rest.join("/");
    } else if (/^[^/]+:\d+/.test(str)) {
        const [host, rest] = str.split(":");
        const [p, ...restPath] = rest.split("/");
        hostname = host;
        port = Number(p);
        path = restPath.length ? "/" + restPath.join("/") : "/";
    } else if (/^[^/]+\/.*$/.test(str)) {
        const [host, ...restPath] = str.split("/");
        hostname = host;
        path = "/" + restPath.join("/");
    } else {
        hostname = str;
    }

    path = ensureTrailingSlash(path);
    if (port === undefined) {
        port = protocol === "https" ? 443 : 80;
    }

    return (`${protocol}://${hostname}:${port}${path}`);
}

function ensureTrailingSlash(path: string): string {
    return path.endsWith("/") ||
        path.includes("?") ||
        path.includes("#") ||
        path.includes('.')
        ? path
        : path + "/";
}

export { parseUrlLike, getHeadersSync, debounce }