The issue reported says "Workers Builds: explorecms Conclusion: failure". Cloudflare Pages typically runs the build command specified in the framework preset (e.g. `npm run build` or `pnpm run build`).

Looking at the build output earlier, the Next.js static prerendering works but it spams a lot of errors like:
`Failed to fetch blog listing posts, likely due to missing DB at build time: TypeError: resp.body?.cancel is not a function`
and
`[Setup] Database initialization failed: DATABASE_URL not set`

The build output exited with code 0 though (`Exit code: 0`). Wait, does Cloudflare Pages actually fail because of standard errors or a non-zero exit code? Cloudflare Pages treats any non-zero exit code as a failure.
