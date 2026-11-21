function articleUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol === 'https:' && !url.username && !url.password) return url;
    } catch {}
    return null;
}

const libraries = {
    players: ['dash.min.js', 'hls.min.js'],
    readability: ['readability.js']
};

chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'load-library') {
        const files = libraries[message.name];
        if (!files || !sender.tab?.id || !/^https:\/\/(www|old)\.reddit\.com\//.test(sender.url || '')) return;
        chrome.scripting.executeScript({ target: { tabId: sender.tab.id, frameIds: [sender.frameId ?? 0] }, files })
            .then(() => respond({}), () => respond({ error: 'unavailable' }));
        return true;
    }
    if (!['article-fetch', 'article-allow'].includes(message?.type)) return;
    if (!sender.tab?.id || !/^https:\/\/(www|old)\.reddit\.com\//.test(sender.url || '')) return;
    const url = articleUrl(message.url);
    if (!url) return;
    const origins = [url.origin + '/*'];
    if (message.type === 'article-allow') {
        const settings = new URL(chrome.runtime.getURL('article-permission.html'));
        settings.search = new URLSearchParams({ origin: url.origin, tab: sender.tab.id });
        chrome.tabs.create({ url: settings.href, openerTabId: sender.tab.id })
            .then(() => respond({}), () => respond({ error: 'unavailable' }));
    } else {
        (async () => {
            if (!await chrome.permissions.contains({ origins })) return { error: 'permission' };
            const response = await fetch(url, {
                credentials: 'omit',
                redirect: 'error',
                signal: AbortSignal.timeout(12000)
            });
            if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
                return { error: 'unavailable' };
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let size = 0;
            let html = '';
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                size += value.length;
                if (size > 4_000_000) {
                    await reader.cancel();
                    return { error: 'unavailable' };
                }
                html += decoder.decode(value, { stream: true });
            }
            return { html: html + decoder.decode() };
        })().then(respond, () => respond({ error: 'unavailable' }));
    }
    return true;
});
