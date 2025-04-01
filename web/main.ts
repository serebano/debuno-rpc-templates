import { App } from "./app.ts"
import { hydrate } from 'https://esm.sh/preact'
import { Demo, Demo2 } from "./demo.tsx";

await App()

document.querySelector('footer')!.innerHTML = await Demo2()

hydrate(Demo(), document.querySelector('footer')!)

if (import.meta.hot) {
    import.meta.hot.accept()
}
