const getUserAgent = async (env: 'server' | 'client'): Promise<string> => {
    switch (env) {
        case 'client': return await import.meta.rpc('getUserAgent', 'server');
        case 'server': return navigator.userAgent
    }
}

const getUserAgents = async (): Promise<{ server: string; client: string; }> => ({
    server: await getUserAgent('server'),
    client: await getUserAgent('client')
})

export {
    getUserAgent,
    getUserAgents
}