# Ops: Start/Restart (Supervisor)

- Start: `npm run dev:stack:zsh` – startet API (4100) und Web (3002).
- Always‑Fresh Build: Vor Web‑Start wird `.next/BUILD_ID` gegen Quellen geprüft (package.json, next.config.mjs, app/, components/). Bei Bedarf Clean‑Build (`rm -rf .next`, `npm ci`, `next build`).
- Readiness: Health‑Probe GET `http://localhost:3002/` mit Backoff.
- Self‑Heal: Falls 500 oder "vendor‑chunks/Cannot find module …next" im Log, genau 1× Clean‑Rebuild + Restart.
- Ports: 3002 (Web), 4100 (API). Ports werden vor Start freigeräumt.
- Logs: `/tmp/web.log`, `/tmp/api.log` (Fallback: `./.logs`).
- Abbruch: Prozesse sind detached; `npm run stop` beendet bekannte Starts.
