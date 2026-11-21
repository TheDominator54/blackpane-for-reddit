# Hard Black Reader for Reddit

A Chrome extension that turns Old Reddit into a two-pane reader. The post list stays on the left. Select a post and it opens on the right with its text, images, video and comments, without leaving the feed. Pure black, one accent colour, keyboard driven.

## Features

- Split view with a draggable divider; the feed keeps loading as you scroll.
- Images and video fill the pane first, then the discussion starts on the next screen.
- Threaded comments with click-to-collapse rails, scores and ages.
- Reader mode for linked articles, enabled per site only when you ask.
- Video players (dash.js, hls.js) and the article parser (Readability) load only when a post needs them.
- Options popup: autoplay, start muted, reset list width.

## Keyboard

| Key | Action |
| --- | --- |
| ↑ ↓ | Previous or next post |
| → | Jump to comments, then page down through them |
| ← | Back to the top of the post |
| Space | Play or pause video |

## Install (unpacked)

1. Open `chrome://extensions` and turn on Developer mode.
2. Click **Load unpacked** and choose the `reddit-reading-pane` folder.
3. Open [old.reddit.com](https://old.reddit.com). It also works on www.reddit.com when your account uses the classic layout.

## Layout

```
reddit-reading-pane/   the extension (load this folder)
store/                 Chrome Web Store listing text, privacy policy, promo tile
```

## Privacy

No data collection, no analytics, no servers. See [store/privacy.html](store/privacy.html).

## Third-party code

Bundled under their own licenses, see the `*-LICENSE` files in the extension folder: [dash.js](https://github.com/Dash-Industry-Forum/dash.js) 4.7.4, [hls.js](https://github.com/video-dev/hls.js) 1.6.13, [Mozilla Readability](https://github.com/mozilla/readability).

## License

MIT, see [LICENSE](LICENSE).
