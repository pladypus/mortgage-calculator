# Mortgage calculator

A simple monthly-mortgage-payment calculator with a breakdown chart. Live at
https://mortgages.pladypus.dev.

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

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and
publishes `dist/` to GitHub Pages. `public/CNAME` pins the custom domain.

One-time setup:

1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. DNS for `pladypus.dev`: add a `CNAME` record `mortgages` → `<your-github-username>.github.io`.
3. Once GitHub has issued the certificate, tick **Enforce HTTPS** on the Pages settings page.
