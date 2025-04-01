document.body.innerHTML = await import('./mod.ts').then(mod => {
    return mod.default()
})

if (import.meta.hot) {
    import.meta.hot.accept()
}