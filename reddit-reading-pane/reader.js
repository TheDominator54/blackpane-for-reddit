(() => {
    'use strict';

    const feed = document.querySelector('body > .content');
    const header = document.querySelector('#header');
    if (!header || !feed?.querySelector('.sitetable .thing.link') ||
        document.body.classList.contains('comments-page')) return;

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function webUrl(value) {
        if (!value) return null;
        try {
            const url = new URL(value, location.href);
            return ['https:', 'http:'].includes(url.protocol) ? url : null;
        } catch {
            return null;
        }
    }

    const settings = { autoplay: true, muted: false, listWidth: 0 };
    const settingsReady = chrome.storage.sync.get(settings).then((stored) => {
        Object.assign(settings, stored);
    }).catch(() => {});
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        for (const [key, change] of Object.entries(changes)) {
            if (key in settings) settings[key] = change.newValue ?? (key === 'listWidth' ? 0 : true);
        }
        if ('listWidth' in changes) restoreWidth?.();
    });

    const libraries = new Map();
    function loadLibrary(name) {
        if (!libraries.has(name)) {
            libraries.set(name, chrome.runtime.sendMessage({ type: 'load-library', name }).then((result) => {
                if (result?.error) throw new Error('Library unavailable');
            }).catch((error) => {
                libraries.delete(name);
                throw error;
            }));
        }
        return libraries.get(name);
    }

    function addLink(parent, label, href) {
        const url = webUrl(href);
        if (!url) return;
        const link = element('a', label);
        link.href = url.href;
        parent.append(link);
    }

    function relativeTime(seconds) {
        if (!seconds) return '';
        const diff = Math.max(0, Date.now() / 1000 - seconds);
        const steps = [[60, 's'], [3600, 'm'], [86400, 'h'], [604800, 'd'], [2629800, 'mo'], [Infinity, 'y']];
        let unit = 1;
        for (const [limit, label] of steps) {
            if (diff < limit) return Math.max(1, Math.floor(diff / unit)) + label;
            unit = limit;
        }
        return '';
    }

    const reader = element('aside');
    reader.id = 'hb-reader';
    reader.setAttribute('aria-label', 'Post reading pane');
    reader.tabIndex = -1;
    const article = element('article');
    article.append(element('p', 'Select a post to read it here.', 'hb-reader-status'));
    const readingScroll = element('div', '', 'hb-reading-scroll');
    readingScroll.tabIndex = 0;
    readingScroll.setAttribute('aria-label', 'Post and comments');
    readingScroll.append(article);
    reader.append(readingScroll);
    feed.tabIndex = 0;
    feed.setAttribute('aria-label', 'Post list');
    document.body.append(reader);
    document.body.classList.add('hb-reading-layout');

    function setToolbarIcon(control, label, icon) {
        control.dataset.hbIcon = icon;
        control.dataset.hbLabel = label;
        control.setAttribute('aria-label', label);
    }

    const sortIcons = {
        best: 'best', hot: 'hot', new: 'new', rising: 'rising',
        controversial: 'swap', top: 'top', wiki: 'book'
    };
    for (const control of header.querySelectorAll('#header-bottom-left .tabmenu a')) {
        const label = control.textContent.trim().toLowerCase();
        const parts = webUrl(control.href)?.pathname.split('/').filter(Boolean) ?? [];
        const onCommunity = parts[0]?.toLowerCase() === 'r' && parts.length >= 2;
        const route = onCommunity ? parts[2] || 'hot' : parts[0] || 'best';
        const sort = Object.hasOwn(sortIcons, label) ? label : route;
        if (Object.hasOwn(sortIcons, sort)) {
            setToolbarIcon(control, sort[0].toUpperCase() + sort.slice(1), sortIcons[sort]);
        }
    }

    const leftBar = header.querySelector('#header-bottom-left');
    if (leftBar) {
        const nativeHome = leftBar.querySelector('a#header-img, a#header-img-a');
        const home = element('a', 'reddit', 'hb-reddit-home');
        home.href = webUrl(nativeHome?.href)?.href || '/';
        home.setAttribute('aria-label', 'Reddit home');
        if (nativeHome) nativeHome.replaceWith(home);
        else leftBar.prepend(home);
    }

    const toolbar = [
        ['#mail', 'Messages', 'mail'],
        ['#notifications', 'Notifications', 'bell'],
        ['#chat', 'Chat', 'chat'],
        ['#modmail, #new_modmail', 'Mod messages', 'shield'],
        ['.pref-lang', 'Preferences', 'settings'],
        ['.logout a', 'Log out', 'exit']
    ];
    for (const [selector, label, icon] of toolbar) {
        for (const control of header.querySelectorAll(selector)) {
            setToolbarIcon(control, label, icon);
        }
    }

    const divider = element('div', '', 'hb-divider');
    divider.tabIndex = 0;
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-label', 'Post list width');
    divider.setAttribute('aria-orientation', 'vertical');
    document.body.append(divider);

    function setWidth(value, save = false) {
        const max = Math.floor(window.innerWidth * 0.6);
        const width = Math.round(Math.max(240, Math.min(max, value)));
        document.body.style.setProperty('--hb-list-width', width + 'px');
        divider.setAttribute('aria-valuemin', '240');
        divider.setAttribute('aria-valuemax', String(Math.max(240, max)));
        divider.setAttribute('aria-valuenow', String(width));
        if (save) {
            settings.listWidth = width;
            chrome.storage.sync.set({ listWidth: width }).catch(() => {});
        }
    }

    let preferredWidth;
    var restoreWidth = () => {
        preferredWidth = settings.listWidth;
        setWidth(preferredWidth || Math.min(460, window.innerWidth * 0.34));
    };
    restoreWidth();
    settingsReady.then(restoreWidth);
    window.addEventListener('resize', restoreWidth);
    divider.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        divider.setPointerCapture(event.pointerId);
    });
    divider.addEventListener('pointermove', (event) => {
        if (divider.hasPointerCapture(event.pointerId)) setWidth(event.clientX);
    });
    divider.addEventListener('pointerup', (event) => {
        if (!divider.hasPointerCapture(event.pointerId)) return;
        preferredWidth = event.clientX;
        setWidth(preferredWidth, true);
    });
    divider.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        preferredWidth = Number(divider.getAttribute('aria-valuenow')) + (event.key === 'ArrowLeft' ? -20 : 20);
        setWidth(preferredWidth, true);
    });

    function alignReader() {
        const top = Math.max(0, header.getBoundingClientRect().bottom);
        document.body.style.setProperty('--hb-pane-top', top + 'px');
    }
    alignReader();
    new ResizeObserver(alignReader).observe(header);
    window.addEventListener('resize', alignReader, { passive: true });

    const list = feed.querySelector('.sitetable:has(.thing.link)');
    function addOriginalIcons(root) {
        for (const title of root.querySelectorAll('.thing.link a.title')) {
            const row = title.closest('.thing.link');
            const meta = row.querySelector('.top-matter');
            const url = webUrl(title.href);
            if (!meta || !url || meta.querySelector('.hb-open-original')) continue;
            const link = element('a', '↗', 'hb-open-original');
            link.href = url.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = 'Open original';
            link.setAttribute('aria-label', 'Open original: ' + title.textContent.trim());
            meta.append(link);
        }
    }
    addOriginalIcons(list);
    const pageMarker = element('div', '', 'hb-pagination');
    list.after(pageMarker);
    const nextLink = (root) => root.querySelector('.next-button a, a[rel="next"]');
    function nextPage(root, base) {
        const href = nextLink(root)?.getAttribute('href');
        if (!href) return null;
        const url = new URL(href, base);
        if (!['www.reddit.com', 'old.reddit.com'].includes(url.hostname) || url.protocol !== 'https:') return null;
        return new URL(url.pathname + url.search, location.origin);
    }
    let next = nextPage(feed, location.href);
    let pageRequest;
    const visited = new Set([location.href]);
    const postIds = new Set(Array.from(list.querySelectorAll('[data-fullname]'), (row) => row.dataset.fullname));
    const more = element('button', 'Load more posts');
    more.type = 'button';
    pageMarker.append(more);
    more.hidden = !next;
    function loadMore() {
        if (pageRequest) return pageRequest;
        if (!next || next.origin !== location.origin || visited.has(next.href)) return;
        pageRequest = fetchNextPage().finally(() => { pageRequest = null; });
        return pageRequest;
    }
    async function fetchNextPage() {
        more.disabled = true;
        more.textContent = 'Loading posts…';
        let succeeded = false;
        try {
            const response = await fetch(next);
            if (!response.ok || new URL(response.url).origin !== location.origin) throw new Error('Feed unavailable');
            const page = new DOMParser().parseFromString(await response.text(), 'text/html');
            const rows = page.querySelectorAll('.sitetable .thing.link');
            if (!rows.length) throw new Error('Feed unavailable');
            const fragment = document.createDocumentFragment();
            for (const source of rows) {
                const id = source.dataset.fullname;
                if (id && postIds.has(id)) continue;
                const title = source.querySelector('a.title');
                if (!webUrl(title?.getAttribute('href'))) continue;
                const row = element('div', '', 'thing link');
                const entry = element('div', '', 'entry');
                const matter = element('div', '', 'top-matter');
                const titleLine = element('p', '', 'title');
                addLink(titleLine, title.textContent, title.getAttribute('href'));
                titleLine.firstElementChild.className = 'title';
                const meta = element('p', '', 'tagline');
                for (const type of ['author', 'subreddit']) {
                    const link = source.querySelector('.tagline a.' + type);
                    if (!webUrl(link?.getAttribute('href'))) continue;
                    addLink(meta, link.textContent, link.getAttribute('href'));
                    meta.lastElementChild.className = type;
                }
                const buttons = element('ul', '', 'buttons');
                const comment = source.querySelector('a.comments');
                if (webUrl(comment?.getAttribute('href'))) {
                    const item = element('li');
                    addLink(item, comment.textContent, comment.getAttribute('href'));
                    item.firstElementChild.className = 'comments';
                    buttons.append(item);
                }
                row.dataset.permalink = source.dataset.permalink || '';
                matter.append(titleLine, meta, buttons);
                entry.append(matter);
                row.append(entry);
                fragment.append(row);
                if (id) postIds.add(id);
            }
            addOriginalIcons(fragment);
            list.append(fragment);
            visited.add(next.href);
            next = nextPage(page, response.url);
            if (next && (next.origin !== location.origin || visited.has(next.href))) next = null;
            succeeded = true;
        } catch {
            more.textContent = 'Could not load posts · Retry';
        } finally {
            more.disabled = false;
            more.hidden = !next;
            if (succeeded) {
                more.textContent = 'Load more posts';
                paginationObserver.unobserve(pageMarker);
                if (next) paginationObserver.observe(pageMarker);
            }
        }
    }
    more.addEventListener('click', loadMore);
    const paginationObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) loadMore();
    }, { root: feed, rootMargin: '0px 0px 320px 0px' });
    if (next) paginationObserver.observe(pageMarker);

    let stopStream;
    let selected;
    let selectedTitle;
    let request;
    let showComments = false;

    // First call jumps to the comments; once they are at the top, each call pages down.
    function jumpToComments() {
        const section = article.querySelector('#hb-comments');
        if (!section) return;
        const offset = section.getBoundingClientRect().top - readingScroll.getBoundingClientRect().top;
        const top = offset > 2
            ? readingScroll.scrollTop + offset
            : readingScroll.scrollTop + readingScroll.clientHeight * 0.85;
        readingScroll.scrollTo({ top, behavior: 'instant' });
    }

    const back = element('button', '← Back to posts');
    back.type = 'button';
    back.className = 'hb-mobile-back';
    reader.prepend(back);
    back.addEventListener('click', () => {
        document.body.classList.remove('hb-reader-open');
        reader.querySelector('video')?.pause();
        selectedTitle?.focus({ preventScroll: true });
    });

    function appendMedia(parent, tag, src, title, stream, loops = false, dashSource) {
        const url = webUrl(src);
        const playlist = webUrl(stream);
        const manifest = webUrl(dashSource);
        if (tag === 'video' ? !url && !playlist && !manifest : !url) return false;
        const media = element(tag);
        if (tag === 'video') {
            media.controls = true;
            media.preload = 'auto';
            media.autoplay = settings.autoplay;
            media.muted = settings.muted;
            media.playsInline = true;
            media.loop = loops;
            const play = () => settings.autoplay && media.play().catch((error) => {
                if (error.name === 'NotAllowedError' && media.isConnected) {
                    media.muted = true;
                    media.play().catch(() => {});
                }
            });
            function armAutoplay() {
                media.removeEventListener('canplay', play);
                media.addEventListener('canplay', play, { once: true });
            }
            armAutoplay();
            const direct = () => {
                armAutoplay();
                if (url) media.src = url.href;
                else queueMicrotask(() => media.dispatchEvent(new Event('error')));
            };
            const useHls = () => {
                armAutoplay();
                if (playlist?.hostname === 'v.redd.it' && globalThis.Hls?.isSupported()) {
                    const hls = new globalThis.Hls({ enableWorker: false });
                    const stop = () => hls.destroy();
                    stopStream = stop;
                    hls.on(globalThis.Hls.Events.ERROR, (_, info) => {
                        if (!info.fatal || stopStream !== stop) return;
                        stopStream = null;
                        stop();
                        direct();
                    });
                    hls.loadSource(playlist.href);
                    hls.attachMedia(media);
                } else if (playlist && media.canPlayType('application/vnd.apple.mpegurl')) {
                    media.src = playlist.href;
                } else {
                    direct();
                }
            };
            const stream = () => {
                const dash = globalThis.dashjs;
                if (!loops && manifest?.hostname === 'v.redd.it' && globalThis.MediaSource && dash?.MediaPlayer) {
                    const player = dash.MediaPlayer().create();
                    const stop = () => player.reset();
                    stopStream = stop;
                    const fallback = () => {
                        if (stopStream !== stop) return;
                        stopStream = null;
                        stop();
                        useHls();
                    };
                    try {
                        player.on(dash.MediaPlayer.events.ERROR, fallback);
                        player.on(dash.MediaPlayer.events.STREAM_INITIALIZED, () => {
                            if (stopStream === stop && !player.getTracksFor('audio').length && playlist) fallback();
                        });
                        player.initialize(media, manifest.href, false);
                    } catch {
                        fallback();
                    }
                } else {
                    useHls();
                }
            };
            const streamable = (manifest || playlist)?.hostname === 'v.redd.it';
            if (streamable && !(globalThis.dashjs && globalThis.Hls)) {
                loadLibrary('players').then(
                    () => { if (media.isConnected) stream(); },
                    () => { if (media.isConnected) direct(); });
            } else {
                stream();
            }
        } else {
            media.alt = title;
            media.loading = 'lazy';
            media.src = url.href;
        }
        parent.append(media);
        return true;
    }

    function sameDiscussion(first, second) {
        function discussionId(value) {
            const url = webUrl(value);
            if (!url || !/(^|\.)reddit\.com$/i.test(url.hostname)) return null;
            return url.pathname.match(/\/comments\/([a-z0-9]+)(?:\/|$)/i)?.[1] ?? null;
        }
        const id = discussionId(first);
        return id !== null && id === discussionId(second);
    }

    function renderContent(parent, post, title, fallback, meta = {}) {
        const original = post.crosspost_parent_list?.[0] ?? post;
        const rawBody = (post.selftext || original.selftext || fallback || '').trim();
        const body = /^\[(removed|deleted)\]$/i.test(rawBody) ? '' : rawBody;

        const video = original.secure_media?.reddit_video ||
            original.media?.reddit_video || original.preview?.reddit_video_preview;

        const redditVideo = webUrl(video?.fallback_url);
        const redditOrigin = redditVideo?.hostname === 'v.redd.it' ? redditVideo : null;
        const dash = video?.dash_url || (redditOrigin && new URL('DASHPlaylist.mpd', redditOrigin).href);
        const hls = video?.hls_url || (redditOrigin && new URL('HLSPlaylist.m3u8', redditOrigin).href);
        let hasMedia = appendMedia(parent, 'video', video?.fallback_url, title, hls, video?.is_gif, dash);
        if (hasMedia) {
            const player = parent.lastElementChild;
            const showError = () => {
                player.hidden = true;
                const message = element('p', 'This video could not play in the reading pane. ', 'hb-reader-status');
                addLink(message, 'Open video on Reddit ↗', original.permalink || original.url);
                player.after(message);
            };
            player.addEventListener('error', showError, { once: true });
        }
        for (const item of original.gallery_data?.items ?? []) {
            const media = original.media_metadata?.[item.media_id]?.s;
            hasMedia = appendMedia(parent, 'img', media?.gif || media?.u, title) || hasMedia;
        }

        const url = webUrl(original.url_overridden_by_dest || original.url);
        if (!hasMedia && url && /\.(png|jpe?g|gif|webp|avif)$/i.test(url.pathname)) {
            hasMedia = appendMedia(parent, 'img', url.href, title);
        }
        if (!hasMedia && url && /\.(mp4|webm|gifv)$/i.test(url.pathname)) {
            const loops = /\.gifv$/i.test(url.pathname);
            if (loops) url.pathname = url.pathname.replace(/\.gifv$/i, '.mp4');
            hasMedia = appendMedia(parent, 'video', url.href, title, null, loops);
        }
        if (body) parent.append(formattedText(body, post.selftext_html || original.selftext_html));
        if (!hasMedia && !body && url && !original.is_self && !sameDiscussion(url, post.permalink)) {
            renderLinkedArticle(parent, url);
        }
        const header = element('header', '', 'hb-post-header');
        header.append(element('h1', title, 'hb-text-post-title'));
        const line = element('p', '', 'hb-post-meta');
        const subreddit = original.subreddit_name_prefixed || meta.subreddit;
        const author = post.author || original.author || meta.author;
        const age = relativeTime(post.created_utc || original.created_utc || meta.created);
        if (subreddit) addLink(line, subreddit, '/' + subreddit.replace(/^\/+/, '') + '/');
        if (author) addLink(line, 'u/' + author, '/user/' + author + '/');
        if (age) line.append(element('span', age + ' ago'));
        const permalink = webUrl(post.permalink);
        if (permalink) {
            const open = element('a', 'Open on Reddit ↗');
            open.href = permalink.href;
            line.append(open);
        }
        if (line.childElementCount) header.append(line);
        if (hasMedia) parent.append(header);
        else parent.prepend(header);
    }

    function renderLinkedArticle(parent, url) {
        const panel = element('div', '', 'hb-linked-article');
        const status = element('p', '', 'hb-reader-status');
        const allow = element('button', 'Allow reader mode for ' + url.hostname);
        allow.type = 'button';
        allow.hidden = true;
        panel.append(status, allow);
        parent.append(panel);

        async function load() {
            if (url.protocol !== 'https:' || /(^|\.)reddit\.com$/.test(url.hostname)) {
                status.textContent = 'This post links to ' + url.hostname + '.';
                return;
            }
            status.textContent = 'Loading article…';
            allow.hidden = true;
            try {
                const result = await chrome.runtime.sendMessage({ type: 'article-fetch', url: url.href });
                if (!panel.isConnected) return;
                if (result?.error === 'permission') {
                    status.textContent = 'Allow this site to read its articles here.';
                    allow.hidden = false;
                    return;
                }
                if (!result?.html) throw new Error('Article unavailable');
                if (!globalThis.Readability) await loadLibrary('readability');
                if (!panel.isConnected) return;
                const doc = document.implementation.createHTMLDocument('');
                const base = doc.createElement('base');
                base.href = url.href;
                doc.head.append(base);
                const template = doc.createElement('template');
                template.innerHTML = result.html;
                template.content.querySelectorAll('base, script, iframe, object, embed').forEach((node) => node.remove());
                doc.body.append(template.content);
                const article = new globalThis.Readability(doc).parse();
                if (!article?.textContent?.trim() || article.textContent.trim().length < 200) {
                    throw new Error('Article unavailable');
                }
                panel.replaceChildren(element('h1', article.title || url.hostname));
                if (article.byline) panel.append(element('p', article.byline, 'hb-article-byline'));
                panel.append(formattedText(article.textContent, article.content, url.href));
            } catch {
                status.textContent = 'Reader mode could not load this article.';
            }
        }
        allow.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'article-allow', url: url.href }).catch(() => {
                status.textContent = 'Could not open the site permission prompt.';
            });
        });
        parent.addEventListener('hb-retry-article', (event) => {
            if (event.detail === url.origin) load();
        });
        load();
    }

    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.id === chrome.runtime.id && message?.type === 'article-allowed') {
            reader.querySelector('.hb-post-body')?.dispatchEvent(
                new CustomEvent('hb-retry-article', { detail: message.origin })
            );
        }
    });

    function formattedText(raw, html, base = location.href) {
        const output = element('div', '', 'hb-formatted');
        if (!html) {
            output.append(element('p', raw));
            return output;
        }
        const parser = new DOMParser();
        let source = parser.parseFromString(html, 'text/html').body;
        if (!source.children.length && source.textContent.includes('<')) {
            source = parser.parseFromString(source.textContent, 'text/html').body;
        }

        const allowed = new Set(['P', 'BR', 'STRONG', 'EM', 'B', 'I', 'DEL', 'S', 'CODE',
            'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'A', 'HR', 'H1', 'H2', 'H3', 'H4',
            'H5', 'H6', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SUP']);
        function copy(parent, node) {
            if (node.nodeType === Node.TEXT_NODE) {
                parent.append(document.createTextNode(node.textContent));
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE ||
                ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(node.tagName)) return;
            const safe = allowed.has(node.tagName) ? element(node.tagName.toLowerCase()) : parent;
            if (node.tagName === 'A') {
                let href;
                const target = node.getAttribute('href');
                try { if (target) href = webUrl(new URL(target, base).href); } catch {}
                if (href) safe.href = href.href;
            }
            for (const child of node.childNodes) copy(safe, child);
            if (safe !== parent) parent.append(safe);
        }

        for (const node of source.childNodes) copy(output, node);
        return output;
    }

    function renderComments(parent, entries, threadUrl) {
        const section = element('section');
        section.id = 'hb-comments';
        section.tabIndex = -1;
        section.setAttribute('aria-label', 'Comments');
        let count = 0;

        function appendComments(container, comments, depth) {
            for (const entry of comments) {
                if (count >= 100 || entry.kind !== 't1' || !entry.data?.body) continue;
                const item = element('details', '', 'hb-comment');
                const author = entry.data.author || '[deleted]';
                item.open = author.toLowerCase() !== 'automoderator';
                const score = typeof entry.data.score === 'number' && !entry.data.score_hidden
                    ? ' · ' + entry.data.score + ' pts' : '';
                const summary = element('summary', author);
                if (score) summary.append(element('span', score, 'hb-comment-score'));
                const age = relativeTime(entry.data.created_utc);
                if (age) summary.append(element('span', ' · ' + age, 'hb-comment-age'));
                item.append(summary, formattedText(entry.data.body, entry.data.body_html));
                const branch = element('div', '', 'hb-comment-branch');
                const rail = element('button', '', 'hb-comment-rail');
                rail.type = 'button';
                const updateRail = () => {
                    rail.setAttribute('aria-label', (item.open ? 'Collapse' : 'Expand') + ' comment by ' + author);
                    rail.setAttribute('aria-expanded', String(item.open));
                };
                rail.addEventListener('click', () => { item.open = !item.open; });
                item.addEventListener('toggle', updateRail);
                updateRail();
                branch.append(rail, item);
                container.append(branch);
                count++;
                const replies = entry.data.replies?.data?.children ?? [];
                if (depth < 4) appendComments(item, replies, depth + 1);
            }
        }

        appendComments(section, entries, 0);
        if (!count) section.append(element('p', 'No comments to show here.', 'hb-reader-status'));
        addLink(section, 'Open full discussion ↗', threadUrl);
        parent.append(section);
    }

    const threadCache = new Map();
    async function loadThread(endpoint, signal) {
        const key = endpoint.pathname.replace(/\/$/, '');
        if (threadCache.has(key)) return threadCache.get(key);
        const result = await fetchThread(endpoint, signal);
        threadCache.set(key, result);
        if (threadCache.size > 30) threadCache.delete(threadCache.keys().next().value);
        return result;
    }

    async function fetchThread(endpoint, signal) {
        const thread = new URL(endpoint.pathname, location.origin);
        const json = new URL(thread.pathname.replace(/\/$/, '') + '.json', thread.origin);
        json.search = '?raw_json=1&limit=50&depth=5';
        try {
            const response = await fetch(json, { signal });
            if (response.status === 429) throw Object.assign(new Error('Rate limited'), { rateLimited: true });
            if (!response.ok) throw new Error('JSON unavailable');
            const data = await response.json();
            const post = data[0]?.data?.children?.[0]?.data;
            if (!post) throw new Error('Post unavailable');
            return { post, comments: data[1]?.data?.children ?? [] };
        } catch (error) {
            if (signal.aborted || error.rateLimited) throw error;
            const response = await fetch(thread, { signal });
            if (response.status === 429) throw Object.assign(new Error('Rate limited'), { rateLimited: true });
            if (!response.ok) throw new Error('Thread unavailable');
            const page = new DOMParser().parseFromString(await response.text(), 'text/html');
            const post = page.querySelector('.thing.link');
            if (!post) throw new Error('Post unavailable');
            const media = post.querySelector('.expando video[src], .expando img[src], .expando video source[src]');
            const postData = {
                selftext: post.querySelector('.usertext-body .md')?.innerText ||
                    post.querySelector('.usertext-body .md')?.textContent,
                url: media?.getAttribute('src') || post.querySelector('a.title')?.getAttribute('href')
            };
            const comments = Array.from(page.querySelectorAll('.commentarea .thing.comment'), (comment) => {
                const entry = comment.querySelector(':scope > .entry');
                return {
                    kind: 't1',
                    data: {
                        author: entry?.querySelector('a.author')?.textContent,
                        body: entry?.querySelector('.usertext-body .md')?.textContent.trim(),
                        body_html: entry?.querySelector('.usertext-body .md')?.innerHTML
                    }
                };
            });
            return { post: postData, comments };
        }
    }

    async function select(post, title, keyboard) {
        request?.abort();
        showComments = false;
        stopStream?.();
        stopStream = null;
        request = new AbortController();
        const { signal } = request;
        selected?.classList.remove('hb-current-post');
        selectedTitle?.removeAttribute('aria-current');
        selected = post;
        selectedTitle = title;
        post.classList.add('hb-current-post');
        title.setAttribute('aria-current', 'true');
        document.body.classList.add('hb-reader-open');

        const postTitle = title.textContent.trim();
        const comments = post.querySelector('a.comments');
        const content = element('div');
        const postSection = element('section', '', 'hb-post');
        postSection.setAttribute('aria-label', postTitle);
        const postBody = element('div', '', 'hb-post-body');
        postSection.append(postBody);
        content.append(postSection);
        article.replaceChildren(content);
        readingScroll.scrollTop = 0;
        if (keyboard || matchMedia('(max-width: 720px)').matches) reader.focus({ preventScroll: true });

        const fallback = post.querySelector('.expando .md')?.textContent.trim();
        const stamp = post.querySelector('.tagline time')?.getAttribute('datetime');
        const rowMeta = {
            subreddit: post.querySelector('.tagline a.subreddit')?.textContent.trim(),
            author: post.querySelector('.tagline a.author')?.textContent.trim(),
            created: stamp ? Date.parse(stamp) / 1000 : 0
        };
        try {
            const endpoint = webUrl(comments?.href || post.dataset.permalink);
            if (!endpoint || !/(^|\.)reddit\.com$/.test(endpoint.hostname) || !endpoint.pathname.includes('/comments/')) {
                throw new Error('No Reddit permalink');
            }
            const thread = await loadThread(endpoint, signal);
            if (signal.aborted) return;
            postBody.replaceChildren();
            renderContent(postBody, { permalink: endpoint.href, ...thread.post }, postTitle, fallback, rowMeta);
            renderComments(content, thread.comments, endpoint.href);
        } catch (error) {
            if (signal.aborted) return;
            postBody.replaceChildren();
            renderContent(postBody, { url: title.href, permalink: comments?.href || post.dataset.permalink }, postTitle, fallback, rowMeta);
            const reason = error?.rateLimited
                ? 'Reddit is rate limiting requests. Try again in a minute.'
                : 'Could not load comments in the pane.';
            const unavailable = element('section');
            unavailable.id = 'hb-comments';
            unavailable.tabIndex = -1;
            unavailable.setAttribute('aria-label', 'Comments');
            unavailable.append(element('p', reason, 'hb-reader-status'));
            addLink(unavailable, 'Open full discussion ↗', comments?.href);
            content.append(unavailable);
        }
        if (showComments) jumpToComments();
    }

    feed.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const post = event.target.closest('.sitetable .thing.link');
        const title = post?.querySelector('a.title');
        if (!title) return;
        const control = event.target.closest('a, button, input, select, textarea, [role="button"]');
        if (control && control !== title) return;
        if (!control && window.getSelection()?.toString()) return;
        event.preventDefault();
        event.stopPropagation();
        select(post, title, event.detail === 0);
    }, true);

    document.addEventListener('pointerdown', () => {
        document.body.classList.remove('hb-arrow-navigation');
    }, true);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') document.body.classList.remove('hb-arrow-navigation');
    }, true);

    document.addEventListener('keydown', async (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
            event.target.closest?.('input, textarea, select, video, audio, [contenteditable], [role="separator"]')) return;
        const { key } = event;
        if (key === ' ') {
            if (event.target.closest?.('button, summary, [role="button"], [role="slider"]')) return;
            const video = article.querySelector('video:not([hidden])');
            if (!video || video.error) return;
            event.preventDefault();
            if (event.repeat) return;
            if (video.paused) video.play().catch(() => {});
            else video.pause();
            return;
        }
        if (key.startsWith('Arrow')) document.body.classList.add('hb-arrow-navigation');
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            if (!selected) return;
            event.preventDefault();
            showComments = key === 'ArrowRight';
            if (showComments) jumpToComments();
            else readingScroll.scrollTop = 0;
            return;
        }
        if (key !== 'ArrowUp' && key !== 'ArrowDown') return;
        event.preventDefault();
        const visiblePosts = () => Array.from(list.querySelectorAll('.thing.link'))
            .filter((row) => row.getClientRects().length && row.querySelector('a.title'));
        let posts = visiblePosts();
        const prior = selected;
        const index = selected ? posts.indexOf(selected) + (key === 'ArrowDown' ? 1 : -1) : 0;
        if (index >= posts.length && next && key === 'ArrowDown') {
            await loadMore();
            if (selected !== prior) return;
            posts = visiblePosts();
        }
        const row = posts[index];
        if (!row) return;
        row.scrollIntoView({ block: 'nearest' });
        select(row, row.querySelector('a.title'), true);
    });

    reader.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && matchMedia('(max-width: 720px)').matches) back.click();
    });
})();
