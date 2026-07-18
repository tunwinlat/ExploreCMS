# ExploreCMS REST API (`/api/v1`)

External, key-authenticated REST API for managing blog posts, projects and the photo gallery.

## Authentication

Create API keys in the admin dashboard under **Management → API Keys** (owner only).
Keys are shown **once** at creation time — store them somewhere safe.

Send the key with every request, either as a Bearer token or a dedicated header:

```bash
-H "Authorization: Bearer ecms_your_key_here"
# or
-H "X-API-Key: ecms_your_key_here"
```

### Error codes

| Status | Meaning |
|--------|---------|
| 401 | Missing, invalid, revoked or expired API key |
| 403 | Key is valid but lacks the required permission |
| 429 | Rate limit exceeded (60 reads/min, 10 writes/min per IP) |
| 400 | Validation error — the `error` field describes the problem |
| 409 | Idempotency-key reuse with a different request, or an exact post collision |
| 404 | Resource not found |

## Permissions

Each key carries its own permission set in `resource:action` format:

| Resource | Actions |
|----------|---------|
| `posts` | `posts:read` `posts:create` `posts:update` `posts:delete` |
| `projects` | `projects:read` `projects:create` `projects:update` `projects:delete` |
| `gallery` | `gallery:read` `gallery:create` `gallery:update` `gallery:delete` |

Wildcards: `posts:*` grants all post actions; `*` grants full access.

## Posts

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/posts` | `posts:read` |
| POST | `/api/v1/posts` | `posts:create` |
| GET | `/api/v1/posts/{id}` | `posts:read` |
| PATCH | `/api/v1/posts/{id}` | `posts:update` |
| DELETE | `/api/v1/posts/{id}` | `posts:delete` |

**List query params:** `published` (`true`/`false`), `limit` (1–100, default 20), `cursor` (from `nextCursor`).

**Create body:**

```json
{
  "title": "Hello API",               // required
  "content": "# Hi there",            // required
  "contentFormat": "markdown",        // "markdown" (default) | "html"
  "slug": "custom-slug",              // optional, generated from title
  "published": true,                  // default false
  "isFeatured": false,
  "tags": ["api", "news"],            // created automatically if new
  "language": "en",
  "translationGroupId": null,
  "idempotencyKey": "018f6f4d-..."  // optional; header is preferred
}
```

For retry-safe creates, send a unique `Idempotency-Key` (maximum 255 characters).
The key is scoped to the API-key owner's account. Replaying the same request and
key returns the original post with status `200` and `Idempotent-Replayed: true`;
reusing the key with a different request returns `409 Conflict`. The
`idempotencyKey` JSON field is supported for clients that cannot set custom
headers. If both are supplied, they must match.

**Update body:** any subset of the same fields. Omitting a field leaves it unchanged.

Posts created via the API are attributed to the user who created the API key.

```bash
# Create a post
curl -X POST https://your-site.com/api/v1/posts \
  -H "Authorization: Bearer ecms_..." \
  -H "Idempotency-Key: 018f6f4d-7c2a-7c10-a5b8-1f621b6c9342" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello API","content":"# Hi","published":true,"tags":["api"]}'

# Update a post
curl -X PATCH https://your-site.com/api/v1/posts/POST_ID \
  -H "Authorization: Bearer ecms_..." \
  -H "Content-Type: application/json" \
  -d '{"published":false}'
```

## Projects

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/projects` | `projects:read` |
| POST | `/api/v1/projects` | `projects:create` |
| GET | `/api/v1/projects/{id}` | `projects:read` |
| PATCH | `/api/v1/projects/{id}` | `projects:update` |
| DELETE | `/api/v1/projects/{id}` | `projects:delete` |

**Create body:**

```json
{
  "title": "My Project",              // required
  "tagline": "Short pitch",
  "content": "<p>Long description</p>",
  "contentFormat": "html",            // "html" (default) | "markdown"
  "coverImage": "https://…",
  "status": "completed",              // completed | in_progress | archived
  "featured": false,
  "published": true,
  "githubUrl": "https://github.com/…",
  "liveUrl": "https://…",
  "techTags": ["nextjs", "prisma"],   // array of strings
  "order": 0,
  "slug": "custom-slug"
}
```

## Gallery

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/gallery/albums` | `gallery:read` |
| POST | `/api/v1/gallery/albums` | `gallery:create` |
| GET | `/api/v1/gallery/albums/{id}` | `gallery:read` |
| PATCH | `/api/v1/gallery/albums/{id}` | `gallery:update` |
| DELETE | `/api/v1/gallery/albums/{id}` | `gallery:delete` |
| POST | `/api/v1/gallery/albums/{id}/photos` | `gallery:create` |
| GET | `/api/v1/gallery/photos/{id}` | `gallery:read` |
| PATCH | `/api/v1/gallery/photos/{id}` | `gallery:update` |
| DELETE | `/api/v1/gallery/photos/{id}` | `gallery:delete` |

**Album body:** `title` (required), `description`, `coverImage`, `featured`, `published`, `order`, `slug`.

Deleting an album also deletes all of its photos.

**Add a photo** to an album (`POST /api/v1/gallery/albums/{id}/photos`):

```json
{
  "url": "https://cdn.example.com/photo.jpg",   // required, http(s) only
  "title": "Sunset",
  "description": "",
  "location": "Tokyo",
  "takenAt": "2026-07-01T12:00:00Z",            // ISO 8601 or null
  "featured": false,
  "order": 0                                     // defaults to end of album
}
```

**Update a photo** (`PATCH /api/v1/gallery/photos/{id}`): any subset of the same fields, plus `albumId` to move the photo to a different album.

## Notes

- All mutations automatically revalidate the public site cache — changes are visible immediately.
- An exact title-and-slug collision returns the existing post for the same
  author (or `409` for another author). A timestamp suffix is only added when a
  genuinely different title normalizes to the same slug base.
- Craft.do sync safeguards apply: posts synced from Craft in `read-only` mode cannot be edited via the API, and deletions propagate to Craft in `full-sync` mode.
