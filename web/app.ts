import config from './config.json' with {type: 'json'}
import sayHi from "./sayHi.ts"
import { getUserAgents } from "./getUserAgents.ts";

async function header() {
    return `
        <div style="padding: 20px">
            <h1> ${await sayHi(config.name)}</h1>
            <pre>${JSON.stringify(await getUserAgents(), null, 2)}</pre>
        </div>
    `
}

async function main() {
    return await fetch(import.meta.url, {
        headers: { 'x-fetch-dest': 'document' }
    })
        .then(res => res.text())
    //.then(res => `<pre>${res.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>`)
}

function render(selector: string, innerHTML: any) {
    const el = document.querySelector(selector)!
    el.innerHTML = String(innerHTML)

    return el
}

async function App() {
    render('header', await header())
    render('main', await main())
}

export { App, render }