# UpLift Description

# Group Members

| Name | GitHub ID |
|---|---|
| Daniel Gililov | [FunnyShaker](https://github.com/FunnyShaker) |
| Vadim Kurbanbakiyev | [KVadim2001](https://github.com/KVadim2001) |
| Yasin Hajilou | [yasinhajilou](https://github.com/yasinhajilou) |

# Uplift is a centralized air travel platform

## Product summary
Uplift is a global air travel platform that brings together flight search, booking, and trip management for all airlines in one centralized system.

The site aims to make experience better for.
- People who fly on a regular basis.
- Business and corporate explorers.
- Families and leisure vacationers.

Uplift makes air travel easy.
- To search and book flights through one common interface.
- Consolidating airline loyalty programs and incentives.
- Complying with corporate travel policies and approvals.
- Providing complete trip and booking management.

## Running the project locally

This repo holds two npm projects: `backend/` (Express API) and `frontend/` (React).
The scripts at the root run them together.

```bash
npm run install:all   # first time only - installs root, backend and frontend
npm run dev           # starts the API on :3500 and the React app on :3000
```

`Ctrl+C` stops both. To run just one: `npm run dev:backend` or `npm run dev:frontend`.

The backend needs `backend/.env` before it can reach the database - copy
`backend/.env.example` and fill it in, then check it with `npm run check-db`.
See [backend/README.md](backend/README.md) for the API and database details.

## Why This Repository Was Created.
The Agile Product Backlog for the Uplift platform is being implemented with the help of GitHub Issues and a single Product Backlog milestone.

The backlog is supposed to be complete, structured clearly and ready to be planned for sprints in coming development cycles.
