import { serve } from '@debuno/rpc'
import { cyan, gray, green, magenta, red } from "jsr:@std/fmt@1.0.6/colors";


await serve(null, {
    // consoleLevels: ['info', 'warn', 'error'],
    onInit(server) {
        console.time(server.$id)
        console.groupEnd()
        console.log()
        console.group(`${cyan(server.$id)}`)
    },
    onListening(server) {
        console.group()
        server.apps.forEach(app => {
            console.log('app(', app.config.server.base, green(app.config.server.url + '?dash=dev'), ')')
        })
        console.groupEnd()
    },
    onErrored(server) {
        console.group()
        console.log(red(String(server.error)))
        console.groupEnd()
    },
    onClosed(server) {
        console.groupEnd()
        console.log()
    },
    onStateChange(server) {
        console.log(`${gray(server.$id)} (${magenta(server.state)})`)
    },
})
