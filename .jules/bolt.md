## 2024-05-18 - Avoid over-optimization without measurements
**Learning:** Adding lazy loading with a simple inline HTML attribute improves perceived performance natively, but ensure code comments explaining the change are present when requested by prompt instructions, to be compliant with code review requests.
**Action:** Include brief inline comments explaining simple optimizations when specified.
## 2024-05-18 - Avoid adding Edge Runtime randomly
**Learning:** Cloudflare Pages deployments using @cloudflare/next-on-pages execute in the Edge Runtime, which does not natively support standard Node.js modules. Do not blindly apply `export const runtime = "edge"` to Next.js routes to fix build errors, as this will cause the build to fail for any route dependent on Node APIs.
**Action:** Only use the edge runtime when appropriate and do not apply it broadly across routes without checking node module dependencies.
