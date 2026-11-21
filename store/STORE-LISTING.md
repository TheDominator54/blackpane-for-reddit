# Chrome Web Store listing — Hard Black Reader for Reddit

## Name
Hard Black Reader for Reddit

## Summary (132 characters max)
Read Old Reddit in a split view: post list on the left, post, media and comments on the right. Keyboard driven, pure black.

## Description
Hard Black Reader turns Old Reddit into a two-pane reader. The post list stays on the left. Click or arrow to a post and it opens on the right with its text, images, video and comments, without leaving the feed.

What it does
• Split view: feed on the left, post and comments on the right, with a draggable divider.
• Pure black theme with one calm accent colour, built for late-night reading.
• Images and video fill the pane first, then the discussion starts on the next screen.
• Threaded comments with click-to-collapse rails, scores and ages.
• Reader mode for linked articles, enabled per site only when you ask.
• Infinite feed: the next page loads as you reach the bottom.
• Works with your existing Reddit login and saved posts.

Keyboard
• ↑ ↓ previous or next post
• → jump to comments, then page down through them
• ← back to the top of the post
• Space play or pause video

Requirements
Works on old.reddit.com, and on www.reddit.com when your account is set to the classic layout. It does not change the Reddit redesign.

Privacy
No data collection, no analytics, no servers. See the privacy policy.

## Category
Productivity (or Social & Communication)

## Single purpose statement
Displays Old Reddit posts and their comments in a reading pane beside the post list.

## Permission justifications
- **Host permission: old.reddit.com, www.reddit.com** — Required to inject the reading pane into Reddit pages and to load the bundled video player and article parser into the page only when a post needs them.
- **scripting** — Loads the bundled video player (dash.js, hls.js) and article parser (Readability) into the Reddit tab on demand, instead of on every page load, to keep Reddit fast.
- **storage** — Saves the post list width and the user's autoplay and mute preferences.
- **Optional host permission: https://*/*** — Requested one site at a time, only when the user clicks "Allow reader mode for <site>" on a post that links to that site. Used to fetch that article page (without cookies) so it can be shown in the pane. Never requested automatically.

## Remote code
None. All JavaScript is bundled in the package.

## Privacy policy
Host `privacy.html` from this folder at a public URL (GitHub Pages works) and paste the URL in the Privacy tab of the developer dashboard. Also tick "This item does not collect user data" in the data usage disclosure.

## Assets
- Icons: in the extension package at `icons/` (16, 32, 48, 128).
- Small promo tile: `promo-440x280.png` in this folder. Optional; add the name in an image editor if you want text on it.
- Screenshots (required, 1280×800 or 640×400, 1 to 5): take these from the real extension. Suggested set:
  1. A text post with comments open.
  2. An image or video post filling the pane.
  3. A linked article in reader mode.
  4. The collapsed comment rails.
  5. The options popup.

## Changelog for the listing
2.0.0
- Renamed to Hard Black Reader for Reddit, added icons and an options page (autoplay, mute, reset list width).
- Video players and the article parser now load only when a post needs them, so Reddit pages load faster.
- Threads you have already opened are cached, and Reddit rate limits show a clear message.
- Right arrow jumps to comments, then pages through them.
- Consolidated stylesheet with a single palette, full-width text, comment timestamps, code block styling.

## Pre-submission checklist
- [ ] Load the unpacked folder once more and confirm the card shows 2.0.0 with the new icon.
- [ ] Open a video post, a gallery post, a text post, a linked article, and the options popup.
- [ ] Zip only the `reddit-reading-pane` folder contents (not the `store` folder).
- [ ] Pay the one-time developer registration fee if not already done.
- [ ] Set visibility to Unlisted for a first test, then Public.
