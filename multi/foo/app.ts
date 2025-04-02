document.body.innerHTML = await import('./mod.ts').then(async mod => {
    return await mod.default() + '\n\n' + await mod.bar()
})

if (import.meta.hot) {
    import.meta.hot.accept()
}