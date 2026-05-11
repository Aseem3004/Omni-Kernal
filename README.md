# Omni-Kernel

Omni-Kernel is a Distributed Multi-Agent OS for the Web. It separates the orchestration core, individual LLM agent roles, external tools, and real-time transport so each layer can evolve independently.

## Architecture Overview

```text
Omni-Kernel
├── backend/                 Node.js, Express, LangGraph.js, Socket.io server
│   └── src/
│       ├── kernel/          Orchestration, graph state, routing, scheduling
│       ├── agents/          Individual LLM roles and agent definitions
│       ├── tools/           External APIs and tool adapters
│       ├── socket/          Real-time events and Socket.io handlers
│       ├── api/             REST routes and HTTP controllers
│       ├── services/        Shared backend services
│       ├── config/          Environment and runtime configuration
│       └── server.js        Express and Socket.io bootstrap
├── frontend/                React client
│   └── src/
│       ├── components/      Reusable UI components
│       ├── features/        Product feature modules
│       ├── hooks/           React hooks
│       ├── socket/          Client Socket.io connection and event helpers
│       ├── pages/           Route-level screens
│       └── App.jsx          React app shell
├── shared/                  Cross-runtime contracts and constants
├── docs/                    Architecture notes and design decisions
├── scripts/                 Local automation and maintenance scripts
└── tests/                   Integration and end-to-end test entry points
```

## Core Concepts

### Kernel

The Kernel is the orchestration layer. It owns LangGraph.js graphs, multi-agent routing, shared execution state, task scheduling, memory coordination, and agent-to-agent handoffs.

Recommended responsibilities:

- Build and compile LangGraph workflows.
- Maintain graph state schemas and reducers.
- Route tasks to agents based on intent, capability, or policy.
- Coordinate retries, cancellation, streaming, and tool execution.
- Emit lifecycle events to the Socket layer.

### Agents

Agents are individual LLM roles. Each agent should have a narrow responsibility, a clear prompt contract, and an explicit set of tools it is allowed to call.

Example agent roles:

- `plannerAgent`: decomposes high-level user goals into executable steps.
- `researchAgent`: gathers and summarizes external information.
- `developerAgent`: generates code, patches, and implementation plans.
- `reviewerAgent`: inspects outputs for quality, safety, and completeness.

### Tools

Tools are adapters around external APIs and local capabilities. Keep vendor-specific details inside tool modules so agents and kernel workflows call stable internal interfaces.

Example tool groups:

- `apify`: web scraping, crawling, extraction jobs.
- `webSearch`: search provider adapters.
- `storage`: persistence, object storage, vector stores.
- `browser`: browser automation helpers.

### Socket Layer

The Socket layer translates backend execution into real-time client events. It should not contain orchestration policy. Its job is to authenticate connections, register event handlers, and stream state updates from the Kernel to the frontend.

Typical events:

- `task:created`
- `task:status`
- `agent:message`
- `tool:started`
- `tool:completed`
- `kernel:error`

## Backend Structure

```text
backend/src/
├── api/
│   ├── controllers/
│   └── routes/
├── agents/
│   ├── index.js
│   ├── planner.agent.js
│   ├── research.agent.js
│   ├── developer.agent.js
│   └── reviewer.agent.js
├── config/
│   └── env.js
├── kernel/
│   ├── index.js
│   ├── graph.js
│   ├── state.js
│   ├── router.js
│   ├── scheduler.js
│   └── events.js
├── services/
├── socket/
│   ├── index.js
│   ├── events.js
│   └── handlers.js
├── tools/
│   ├── index.js
│   ├── apify/
│   ├── browser/
│   ├── storage/
│   └── web-search/
└── server.js
```

## Frontend Structure

```text
frontend/src/
├── components/
├── features/
│   ├── agents/
│   ├── tasks/
│   └── workspace/
├── hooks/
├── pages/
├── socket/
│   ├── client.js
│   └── events.js
├── styles/
├── App.jsx
└── main.jsx
```

## Suggested Data Flow

1. The React client submits a task through REST or Socket.io.
2. The API layer validates the request and passes it to the Kernel.
3. The Kernel creates or resumes a LangGraph workflow.
4. The graph routes work to one or more Agents.
5. Agents call Tools through stable tool interfaces.
6. Kernel lifecycle events are emitted to the Socket layer.
7. The frontend receives live task, agent, and tool updates.

## Development Notes

- Keep orchestration decisions inside `backend/src/kernel`.
- Keep prompt and role definitions inside `backend/src/agents`.
- Keep provider-specific API code inside `backend/src/tools`.
- Keep transport concerns inside `backend/src/socket`.
- Share only stable contracts through `shared`; avoid importing frontend code into backend code or backend internals into frontend code.
- Prefer event names and payload schemas that are versionable and documented.

