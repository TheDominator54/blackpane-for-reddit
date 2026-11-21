const defaults = { autoplay: true, muted: false };
const autoplay = document.querySelector('#autoplay');
const muted = document.querySelector('#muted');
const reset = document.querySelector('#reset-width');
const status = document.querySelector('#status');

chrome.storage.sync.get(defaults).then((settings) => {
    autoplay.checked = settings.autoplay;
    muted.checked = settings.muted;
});
autoplay.addEventListener('change', () => chrome.storage.sync.set({ autoplay: autoplay.checked }));
muted.addEventListener('change', () => chrome.storage.sync.set({ muted: muted.checked }));
reset.addEventListener('click', async () => {
    await chrome.storage.sync.remove('listWidth');
    status.textContent = 'List width reset. Reddit tabs update on their own.';
});

const allSites = document.querySelector('#all-sites');
const allOrigins = { origins: ['https://*/*'] };
async function refreshAllSites() {
    allSites.checked = await chrome.permissions.contains(allOrigins);
}
allSites.addEventListener('change', async () => {
    try {
        if (allSites.checked) {
            if (!await chrome.permissions.request(allOrigins)) status.textContent = 'Site access was declined.';
        } else {
            await chrome.permissions.remove(allOrigins);
        }
    } catch {
        status.textContent = 'Could not change site access.';
    }
    refreshAllSites();
});
chrome.permissions.onAdded.addListener(refreshAllSites);
chrome.permissions.onRemoved.addListener(refreshAllSites);
refreshAllSites();
