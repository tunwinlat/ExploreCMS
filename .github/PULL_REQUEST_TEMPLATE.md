## What

<!-- What does this PR change? One or two sentences. -->

## Why

<!-- Plane item / issue / motivation -->

## Checklist

- [ ] `npm run lint` and `npm test` pass locally
- [ ] If the Prisma schema changed: the hardcoded migration list in `src/lib/db-init.ts` is updated AND both fast-path probes check the newest artifact (missing this once caused a prod 500)
- [ ] Vercel preview deployment below looks right
