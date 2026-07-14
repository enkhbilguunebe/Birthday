# Our Story Among the Stars

This package keeps the existing explorable universe and adds a dedicated Three.js Birthday Planet page.

## GitHub Pages structure

Upload the contents of this folder directly to the repository root:

- `index.html`
- `birthday-scene.html`
- `.nojekyll`
- `404.html`
- `css/`
- `js/`
- `assets/`

GitHub Pages settings:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`

## Music

Add audio files here:

- `assets/music/background.mp3` — universe and soft birthday-table ambience
- `assets/music/birthday.mp3` — starts after all 19 candles are blown out

Missing music does not stop the website.

## Photos

Tap any 3D frame on `birthday-scene.html` to choose a photo. Photos and crop settings are stored in IndexedDB on that browser.

## Performance

The Birthday Planet automatically starts in lower-quality mode on most phones and lower-memory devices. Use the **Quality** button to switch manually. The preference is saved in the browser.

## Testing locally

Because the Birthday Planet uses JavaScript modules, test through a local web server rather than opening the HTML file directly. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Latest fixes
- Future Planet removed.
- Music Planet labels updated.
- Birthday scene uses only `assets/music/birthday.mp3`.
- Photo frames repositioned so their stands remain on the table.
- Microphone detection now calibrates to room noise and reacts to sustained sound more reliably.
- Added pink, purple, blue, and warm table lighting.
- Dragging performance improved on the universe page.
