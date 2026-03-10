# Optimization Suite

A React + Vite frontend application offering three optimization tools:
- **Tray Packing Optimizer** – Intelligent 2D bin packing with priority-based placement
- **Flight Bar Scheduler** – Scheduling tool for flight bar operations
- **Process Scheduling** – CPU process scheduling visualizer

## Stack

- **Framework**: React 18 + TypeScript
- **Build tool**: Vite 5 with `@vitejs/plugin-react-swc`
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Routing**: React Router v6
- **State/data**: TanStack React Query
- **PWA**: vite-plugin-pwa

## Project Structure

```
src/
  components/      # UI and feature components
  pages/           # Route-level page components
  hooks/           # Custom React hooks
  utils/           # Algorithm implementations (packing, scheduling)
  types/           # TypeScript type definitions
  data/            # Default/seed data
  lib/             # Shared utilities
```

## Running the App

The app runs on port 5000 via the "Start application" workflow using `npm run dev`.

## Notes

- This project was migrated from Lovable to Replit.
- `lovable-tagger` was removed; `vite.config.ts` updated for Replit compatibility (host `0.0.0.0`, port `5000`, `allowedHosts: true`).
- No backend — purely a frontend SPA.
