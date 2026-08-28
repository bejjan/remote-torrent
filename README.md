# Deluge Nova

A modern web UI for [Deluge](https://www.deluge-torrent.org/). It talks to `deluge-web` over JSON-RPC, or runs a built-in demo backend so you can explore the client without a daemon.

Licensed under [GPL-3.0](./LICENSE).

## Features

- Dark-first torrent client layout with a light theme toggle
- Filters, searchable table, details tabs, and a full toolbar (add / pause / resume / remove / queue / move / recheck)
- Connection Manager for `deluge-web` hosts
- First-party preferences (Downloads, Network, Bandwidth, Queue, Proxy, Cache, Daemon, Other, Interface, Plugins)
- Plugin surfaces: Label, Scheduler, Extractor, Execute, Notifications, Blocklist, AutoAdd
- Desktop and mobile (sidebar and details as sheets)

## Demo mode

Leave **Deluge Web URL** blank on the login screen and sign in with password `deluge`.

Demo mode keeps an in-memory session (survives Next.js hot reload) and simulates live download progress.

## Connect to Deluge

1. Run `deluge-web` (default `http://127.0.0.1:8112`).
2. Enter that URL on the login screen, or set `DELUGE_WEB_URL` in `.env.local`.
3. Sign in with your Deluge Web password.
4. Use Connection Manager if the daemon is not connected yet.

For self-signed HTTPS, set `DELUGE_TLS_INSECURE=1`.

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `DELUGE_WEB_URL` | Base URL of `deluge-web` (no trailing slash) |
| `DELUGE_DEMO` | Set to `1` to force the in-memory demo backend |
| `DELUGE_TLS_INSECURE` | Set to `1` to skip TLS verification when proxying |

You can also override the URL per browser via the login form (sent as `X-Deluge-URL`).

## Develop

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm run build
npm start
npm run lint
```

API routes:

- `POST /api/json` — JSON-RPC proxy to `deluge-web` `/json` (cookie forwarding + `Set-Cookie` rewrite), or demo RPC
- `POST /api/upload` — torrent file upload proxy to `deluge-web` `/upload`, or demo upload

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI).
