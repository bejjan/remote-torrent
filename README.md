# Nova

A modern web UI for [Deluge](https://www.deluge-torrent.org/) and [Transmission](https://transmissionbt.com/). It talks to `deluge-web` over JSON-RPC or to Transmission RPC (`POST /transmission/rpc`), or runs a built-in demo backend so you can explore the client without a daemon.

Licensed under [GPL-3.0](./LICENSE).

## Features

- One layout for both clients: filters, searchable table, details tabs, and a full toolbar (add / pause / resume / remove / queue / move / recheck)
- Connection screen: choose **Deluge** or **Transmission**, then URL and credentials
- Connection Manager for Deluge `deluge-web` hosts (hidden in Transmission mode)
- Deluge preferences and plugin surfaces (Label, Scheduler, Extractor, Execute, Notifications, Blocklist, AutoAdd, ltConfig)
- Transmission preferences subset via `session-get` / `session-set` (directories, speed, queue, peers, network)
- Desktop and mobile (sidebar and details as sheets)

## Demo mode

On the connection screen, pick the client type, leave the URL blank, and sign in with password `deluge`.

- **Deluge** demo mocks `deluge-web` JSON-RPC.
- **Transmission** demo mocks Transmission RPC 16+ (including labels).

Demo mode keeps an in-memory session (survives Next.js hot reload) and simulates live download progress.

## Connecting

### Deluge

1. Choose **Deluge**.
2. Enter the **full Web URL**, including protocol and port — for example `http://192.168.1.10:8112`. A hostname without `http://` is treated as HTTP; a missing port defaults to `8112`.
3. Sign in with the **Deluge Web password** (same as the official web UI). There is no username on this screen.
4. After login, use **Connection Manager** if the daemon needs a username/password (daemon port is typically `58846`).
5. For HTTPS with a self-signed certificate, tick **Allow self-signed TLS** or set `DELUGE_TLS_INSECURE=1`.

You can also set `DELUGE_WEB_URL` in `.env.local` instead of the login field.

### Transmission

1. Choose **Transmission**.
2. Enter the **RPC URL** — for example `http://127.0.0.1:9091` or `http://host:9091/transmission/rpc`. A missing port defaults to `9091`; a missing path becomes `/transmission/rpc`.
3. Enter **username** (optional) and **password**. Transmission RPC commonly uses HTTP basic auth.
4. For HTTPS with a self-signed certificate, tick **Allow self-signed TLS** or set `TRANSMISSION_TLS_INSECURE=1`.

You can also set `TRANSMISSION_RPC_URL` in `.env.local`.

Nova never talks to the daemon from the browser. Next.js proxies Deluge at `/api/json` and `/api/upload`, and Transmission at `/api/json` (Deluge-shaped facade), `/api/transmission`, and `/api/transmission/upload`.

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `DELUGE_WEB_URL` | Base URL of `deluge-web` (protocol + host + port, no trailing slash) |
| `DELUGE_DEMO` | Set to `1` to force the in-memory Deluge demo backend |
| `DELUGE_TLS_INSECURE` | Set to `1` to skip TLS verification when proxying to Deluge |
| `TRANSMISSION_RPC_URL` | Transmission RPC URL (e.g. `http://127.0.0.1:9091/transmission/rpc`) |
| `TRANSMISSION_DEMO` | Set to `1` to force the in-memory Transmission demo backend |
| `TRANSMISSION_TLS_INSECURE` | Set to `1` to skip TLS verification when proxying to Transmission |

You can also override the URL per browser via the login form (`X-Deluge-URL` or `X-Transmission-URL`). Private/LAN addresses are allowed — that is how this app reaches a NAS.

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

- `POST /api/json` — Deluge JSON-RPC proxy to `deluge-web` `/json`, or a Deluge-shaped facade over Transmission RPC / demo
- `POST /api/upload` — torrent file upload proxy (`deluge-web` `/upload`, or Transmission metainfo)
- `POST /api/transmission` — classic Transmission RPC proxy (`X-Transmission-Session-Id` handshake on 409)
- `POST /api/transmission/upload` — store `.torrent` metainfo for `torrent-add`

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI).
