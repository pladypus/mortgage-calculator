# Mortgage calculator

A simple monthly-mortgage-payment calculator with a breakdown chart. Live at
https://mortgage.pladypus.dev.

## Run locally with Nix

The flake is based on the `node` template from
[the-nix-way/dev-templates](https://github.com/the-nix-way/dev-templates).

```sh
nix run               # install deps if needed, start the dev server
nix run .#preview     # serve the production build (run `npm run build` first)
nix develop           # shell with Node 22 (or `direnv allow` to use .envrc)
```

Once a day, entering the dev shell checks FlakeHub for a newer nixpkgs than
`flake.lock` pins and prints a notice if there is one. It never changes the
lock itself; run `nix flake update` when you want to take the update.

## Develop

```sh
npm install
npm run dev     # local dev server
npm test        # payment-logic tests (vitest)
npm run build   # production build into dist/
```

The payment math lives in `src/mortgage.ts` and is covered by `src/mortgage.test.ts`.

The default interest rate is the national average from Freddie Mac's weekly
[mortgage survey](https://www.freddiemac.com/pmms). Freddie Mac doesn't allow
cross-origin requests, so `npm run rates` downloads it into `public/rates.json`
(git-ignored) and the page loads that file on startup. Without the file, the
rate defaults to 6.5%. Run `npm run rates` once to see the real average locally.

Entering a ZIP code sets the property-tax estimate to that area's effective rate:
total real estate tax paid by homeowners divided by the total value of their
homes, from the Census Bureau's American Community Survey 5-year estimates.
ZIPs with too little data use their 3-digit prefix. `npm run tax-rates` builds
`public/tax-rates.json` (git-ignored) from the newest published survey, about a
60 MB download. The deploy workflow caches that file by survey year, so it picks
up each December's new survey on its own and otherwise reuses the cached copy.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and
publishes `dist/` to GitHub Pages. `public/CNAME` pins the custom domain. It
also runs daily to refresh the rates. GitHub disables scheduled workflows after
60 days without repo activity; re-enable it from the Actions tab if that happens.

One-time setup:

1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. DNS for `pladypus.dev`: add a `CNAME` record `mortgage` → `<your-github-username>.github.io`.
3. Once GitHub has issued the certificate, tick **Enforce HTTPS** on the Pages settings page.
