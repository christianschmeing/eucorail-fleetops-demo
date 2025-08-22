# Vercel Deployment Leitfaden

Dieser Leitfaden verbindet das GitHub-Repository mit Vercel für automatische Deployments beim Merge auf `main`.

## 1) Projekt importieren

- In Vercel: "New Project" → "Import Git Repository" → wähle dieses Repo aus.
- Monorepo: Wähle als Root `apps/web` (Next.js App).

## 2) Build- und Install‑Einstellungen

- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm --workspace apps/web run build` (oder Standard-Erkennung von Vercel verwenden)
- Output: .next (automatisch)

## 3) Environment Variablen

- `NEXT_PUBLIC_API_BASE`: Basis-URL der API (z. B. `https://your-api.example.com`)
- Optional für Preview/Tests: `NEXT_PUBLIC_TEST_MODE=1`

Hinterlege Variablen für Production, Preview und Development in Vercel (Project Settings → Environment Variables). Nutze Secrets für sensible Werte.

## 4) GitHub Integration

- Aktiviere Auto-Deploys für PRs (Preview Deployments) und `main` (Production Deployment).
- Schutz: Falls Preview absichern, verwende Basic‑Auth via Reverse-Proxy oder setze Feature Flags im Frontend.

## 5) API-Bereitstellung

- Die Fastify-API (`packages/api`) läuft separat (z. B. Render/Fly/VM). Hinterlege deren URL in `NEXT_PUBLIC_API_BASE`.
- Alternativ kann eine Edge/Serverless-Variante aufgebaut werden; nicht Teil dieses Setup-Schritts.

## 6) Rollbacks & Observability

- Vercel UI erlaubt Rollbacks auf vorherige Deployments.
- Aktiviere Analytics/Logs, optional Speed Insights.

## 7) CI: Preview + Test (PR) – Standardweg

- Workflow: `.github/workflows/preview.yml`
- Ablauf:
  - Baut und deployt eine Vercel Preview für die PR (apps/web).
  - Kommentiert die Preview‑URL in die PR und lädt sie als Artifact hoch.
  - Führt Playwright E2E gegen die Preview‑URL aus (ohne lokalen Webserver).
- Erforderliche GitHub Secrets:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

## 8) CI: Release Verify (main) – Standardweg

- Workflow: `.github/workflows/release-verify.yml`
- Ablauf:
  - Wartet nach Push auf `main` auf eine erreichbare Production‑URL (200/200 auf `/` und `/api/health`).
  - Führt Playwright gegen diese URL aus und lädt den Report hoch.
  - Speichert die getestete URL als Artifact `tested-url` und schreibt sie in `CHANGESUMMARY.md`.
- Erwartung: Jede Änderung auf `main` liefert eine getestete Vercel‑URL.
