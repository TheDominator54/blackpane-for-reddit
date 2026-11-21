const params = new URLSearchParams(location.search);
const description = document.querySelector('#description');
const status = document.querySelector('#status');
const button = document.querySelector('#allow');
const tab = Number(params.get('tab'));
const origin = params.get('origin');

if (!origin || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin) || !Number.isInteger(tab) || tab < 1) {
    button.disabled = true;
} else {
    description.textContent = 'Let the Reddit reading pane load public articles from ' + origin + '.';
    async function grant(pattern) {
        try {
            if (!await chrome.permissions.request({ origins: [pattern] })) {
                status.textContent = 'Site access was declined.';
                return;
            }
            button.disabled = true;
            await chrome.tabs.sendMessage(tab, { type: 'article-allowed', origin });
            await chrome.tabs.update(tab, { active: true });
            const current = await chrome.tabs.getCurrent();
            if (current?.id) await chrome.tabs.remove(current.id);
        } catch {
            status.textContent = 'Return to Reddit and select the post again to retry.';
        }
    }
    button.addEventListener('click', () => grant(origin + '/*'));
}
