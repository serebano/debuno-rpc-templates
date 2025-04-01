import { defineConfig } from '@debuno/rpc'

export default defineConfig({
    server: {
        path: 'src',
        port: 3030,
        base: '/'
    }
})