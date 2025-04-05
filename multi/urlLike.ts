function parseUrlLike(input: string | number): URL {
    let str = String(input).trim();
    let protocol = 'http';
    let hostname = 'localhost';
    let port: number | undefined;
    let path = '';

    if (/^https?:\/\//.test(str)) {
        return new URL(str);
    }

    if (/^\d+$/.test(str)) {
        port = Number(str);
    } else if (/^\d+\//.test(str)) {
        const parts = str.split('/');
        port = Number(parts.shift());
        path = '/' + parts.join('/');
    } else if (/^[^\/]+:\d+/.test(str)) {
        const [host, portPath] = str.split(':');
        const [p, ...restPath] = portPath.split('/');
        hostname = host;
        port = Number(p);
        path = restPath.length ? '/' + restPath.join('/') : '';
    } else if (/^[^\/]+\//.test(str)) {
        const parts = str.split('/');
        hostname = parts.shift()!;
        path = '/' + parts.join('/');
    } else {
        hostname = str;
    }

    if (hostname === 'https') {
        protocol = 'https';
        hostname = 'a'; // default to some hostname if only 'https' was given
    }

    if (port === undefined) {
        port = protocol === 'https' ? 443 : 80;
    }

    return new URL(`${protocol}://${hostname}:${port}${path}`);
}

// Test cases
const testCases = [
    8080,
    '8080',
    '8080/withpath',
    'localhost:8080',
    'localhost:8080/withpath',
    'http://localhost:8080/withpath',
    'http://localhost/withpath',
    'example.com',
    'localhost/withpath',
    'https://a',
    'a',
];

testCases.forEach(test => {
    console.log([test, parseUrlLike(test).toString()]);
});
