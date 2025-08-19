# System Overview

Die Mermaid-Grafik visualisiert die Hauptkomponenten und Datenflüsse.

```mermaid
flowchart LR
  subgraph Browser["Frontend Browser (User)"]
    UI["Next.js App (React 18)"]
  end

  subgraph Next["Next.js (apps/web)"]
    APIProxy["API Proxy / App Router API-Routes"]
    SSEClient["SSE Client (useSSETrains)"]
  end

  subgraph Fastify["Fastify Server (packages/api)"]
    REST["REST Endpoints (/api/*)"]
    SSE["SSE Stream (/events)"]
    WS["WebSocket (/ws)"]
    Swagger["Swagger UI (/docs)"]
  end

  subgraph Data["Data & Seeds"]
    Seeds["seeds/ & data/"]
    Schedules["schedules & rail polylines"]
  end

  Browser -->|HTTP| UI
  UI -->|fetch| APIProxy
  UI -->|SSE| SSEClient
  APIProxy -->|HTTP| REST
  SSEClient -->|SSE| SSE
  UI -.optional ws .-> WS

  REST --> Seeds
  SSE --> Seeds
  REST --> Schedules
  SSE --> Schedules

  Fastify --> Swagger
```

Hinweise:

- Frontend spricht die API entweder direkt via `NEXT_PUBLIC_API_BASE` oder via Proxy-/Route-Helfer (`upstreamJson`).
- Realtime-Daten werden primär via SSE bereitgestellt; WS ist optionaler Fallback.
- Swagger/OpenAPI ist unter `/docs` verfügbar; formale Spezifikation zusätzlich in `docs/openapi.yaml`.
