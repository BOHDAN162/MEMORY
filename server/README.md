# Server layer boundaries

- Server-only logic lives here: actions, DB queries, caching, and content providers.
- Do not import server modules into client components. Keep browser-only code inside `app/` or `components/`.
- Prefer adding `import "server-only";` at the top of concrete server modules to enforce boundaries when server code is introduced.
- Keep credentials and side effects in this layer. Share DTOs and pure helpers through `lib/` when they are safe for both client and server environments.
