# lacrimosica.com

A small, static personal website for Mômô Goudarzi.

## Local preview

Run a local static server (the script is an ES module, so opening `index.html` from disk does not work):

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy

The site runs on Cloudflare Workers as static assets (no Worker script) and is served at `lacrimosica.com` and `www.lacrimosica.com`. From the repo root:

```sh
wrangler login   # once
wrangler deploy
```

- `wrangler.jsonc` sets the Worker name and the two custom domains.
- `.assetsignore` is an allowlist: only `index.html`, `styles.css`, `main.js`, `favicon.svg`, `assets/` and `js/` are uploaded. If you add a new top-level file or folder that the site needs, add a `!/name` line there or it won't be deployed.

The site is plain HTML, CSS and ES modules; no build step or dependencies are required.

## Tests

The hero's logic lives in `js/` as plain modules with tests in `tests/`:

```sh
node --test
```
