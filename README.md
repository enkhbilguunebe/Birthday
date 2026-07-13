# Our Story Among the Stars

A GitHub Pages-ready birthday website.

## Run locally
Open `index.html` with a local server. Examples:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Add your background music
Place your chosen file here:

`assets/music/background.mp3`

The browser can only start music after the visitor clicks a button.

## Add memories
Edit `js/data.js`. Replace each memory's date, location, description, and image path.

## Add photos
Place photos in `assets/images/`, then replace the placeholders in `renderSection('photos')` inside `js/app.js`.

## Add the love letter
Replace the placeholder text in the `letter` section inside `js/app.js`.

## GitHub Pages
1. Create a new GitHub repository.
2. Upload every file and folder from this project.
3. Open repository Settings → Pages.
4. Select “Deploy from a branch.”
5. Choose `main` and `/root`.

## Important
Commercial song files are not included. Add only audio you have permission to use.
The microphone candle feature works best on Chrome or Edge over HTTPS, including GitHub Pages.
