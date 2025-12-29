# Architecture & Boundaries

This project follows a layered structure to keep routing, UI, shared utilities, and server logic isolated.

## Layers
- `app/`: Next.js App Router routes, layouts, and page composition. Keep business logic out of this layer.
- `components/`: Reusable UI and composition. Organize by subfolders:
  - `components/ui/`: shadcn/ui primitives.
  - `components/layout/`: layout scaffolding such as shells, navigation, theme toggles/providers, and branding.
  - `components/features/`: feature-level presentation components (stubs included for upcoming work).
- `lib/`: Shared, side-effect-free code. Store config, types, utilities, and client helpers that are safe in both server and client environments.
- `server/`: Server-only code (actions, content providers, DB access, caching). Do not import from `server/` into client components. Prefer adding `import "server-only";` to server modules to enforce boundaries when server logic is added.

## Conventions
- Use path aliases for clarity: `@/app/*`, `@/components/*`, `@/lib/*`, `@/server/*`.
- Keep Supabase helpers split: browser helpers in `lib/supabase/client.ts` and server helpers in `lib/supabase/server.ts`.
- Shared types belong in `lib/types/`; reusable utilities in `lib/utils/`; static configuration in `lib/config/`.
- Routes should only compose components and call server actions (when introduced). Heavy logic belongs in `server/` or feature modules.
- Client components must not import `server/` modules. Share DTOs or helpers via `lib/` when needed.
