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
