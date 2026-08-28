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

## Point at your deluge-web

1. Enter the **full Web URL**, including protocol and port — for example `http://192.168.1.10:8112`. A hostname without `http://` is treated as HTTP; a missing port defaults to `8112`.
2. Sign in with the **Deluge Web password** (same as the official web UI). There is no username on this screen.
3. After login, use **Connection Manager** if the daemon needs a username/password (daemon port is typically `58846`).
4. For HTTPS with a self-signed certificate, tick **Allow self-signed TLS** or set `DELUGE_TLS_INSECURE=1`.

You can also set `DELUGE_WEB_URL` in `.env.local` instead of the login field.

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `DELUGE_WEB_URL` | Base URL of `deluge-web` (protocol + host + port, no trailing slash) |
| `DELUGE_DEMO` | Set to `1` to force the in-memory demo backend |
| `DELUGE_TLS_INSECURE` | Set to `1` to skip TLS verification when proxying |

You can also override the URL per browser via the login form (sent as `X-Deluge-URL`). Private/LAN addresses are allowed — that is how this app reaches a NAS.

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
