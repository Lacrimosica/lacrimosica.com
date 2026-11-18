# lacrimosica.com

A small, static personal website for Mômô Goudarzi.

## Local preview

Run a local static server (the script is an ES module, so opening `index.html` from disk does not work):

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy with Cloudflare Pages

1. Import this GitHub repository in Cloudflare Pages.
2. Select **None** as the framework preset.
3. Leave the build command empty and set the build output directory to `/`.
4. After the first deployment, add `lacrimosica.com` under **Custom domains** in the Pages project.
5. Follow Cloudflare's DNS prompts and optionally add `www.lacrimosica.com` as a redirect.

The site is plain HTML, CSS and ES modules; no build step or dependencies are required.

## Tests

The hero's logic lives in `js/` as plain modules with tests in `tests/`:

```sh
node --test
```
