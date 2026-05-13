# Product Requirements Document: Confluence API Integration

## Overview

Integrate Atlassian Confluence as a content source for rbhu. Users can connect their Confluence workspace via OAuth2, and the system will fetch pages, blog posts, and comments — converting rich content to clean Markdown for indexing and search.

---

## Background & Context

rbhu already integrates with Jira (Atlassian) and Slack. Both integrations follow a shared pattern:

- Manual OAuth2 flow: redirect → callback → exchange code for tokens → store in Prisma
- A dedicated `*Integration` model in `schema.prisma` (e.g., `JiraIntegration`, `SlackIntegration`)
- A service class with a private `*Fetch` helper that handles auth headers, 401 refresh, and 429 backoff
- A controller that exposes `initiateAuth`, `callback`, and resource-fetching endpoints
- Routes registered under `/api/<integration>` in `server.ts`

Confluence shares the same Atlassian auth infrastructure as Jira (`auth.atlassian.com`), enabling near-identical token handling. The Confluence V2 REST API is used for content retrieval.

---

## Goals

1. Allow a user to connect their Atlassian Confluence workspace via OAuth2.
2. Discover available spaces and their page/blog-post hierarchy.
3. Fetch individual page/blog-post content (including inline comments) using the Confluence V2 API.
4. Convert Confluence's HTML/storage-format content to clean Markdown using Turndown.
5. Resolve internal Confluence page links to their canonical URLs.
6. Extract and index page labels/tags alongside content for richer search.

---

## Non-Goals

- Writing to Confluence (creating/editing pages or comments).
- Full Confluence admin operations or space management.
- Real-time webhooks or push-based sync (pull-only for this scope).
- Support for Confluence Data Center / Server (only Confluence Cloud / Atlassian OAuth2).

---

## User Stories

| ID | Story |
|----|-------|
| US-1 | As a user, I can initiate a Confluence connection from my integrations page so that rbhu can access my Confluence content. |
| US-2 | As a user, after authorising, I am redirected back to the app and my Confluence workspace is linked to my account. |
| US-3 | As a user, I can list all Confluence spaces I have access to. |
| US-4 | As a user, I can browse the page/blog-post hierarchy within a given space. |
| US-5 | As a user, I can fetch the full content of a page or blog post, returned as clean Markdown. |
| US-6 | As a user, page content returned includes inline/footer comments. |
| US-7 | As a user, internal Confluence links within page content are resolved to their full HTTPS URLs. |
| US-8 | As a user, page labels/tags are included in the response for downstream search indexing. |

---

## Functional Requirements

### RB-27 — Confluence OAuth2 Flow

- **Scope**: `read:confluence-content.all offline_access` (Atlassian unified OAuth2).
  - `read:confluence-content.all` covers pages, blog posts, and comments.
  - `offline_access` enables token refresh (identical to Jira).
- **Auth server**: `https://auth.atlassian.com/authorize` / `https://auth.atlassian.com/oauth/token` — same endpoints as Jira.
- **Accessible resources**: After token exchange, call `https://api.atlassian.com/oauth/token/accessible-resources` to obtain `cloudId` for the Confluence site.
- **Token storage**: Tokens are stored in a shared `AtlassianIntegration` Prisma model (keyed on `userId` + `cloudId`). If a `JiraIntegration` already exists for the same `cloudId`, its tokens are reused and the record is updated in place rather than creating a separate Confluence record. See Data Model section.
- **Site selection flow**:
  1. After token exchange, the callback stores the tokens temporarily in session and redirects the user to `${CLIENT_URL}/integrations/confluence/select-site` with the list of available Atlassian sites.
  2. The user selects a site; the frontend calls `POST /api/confluence/select-site` with the chosen `cloudId`.
  3. The backend persists the `AtlassianIntegration` record and redirects to `${CLIENT_URL}/integrations?status=success`.
- **Token refresh**: On 401, refresh using `refresh_token` grant, update the stored tokens, and retry — matching the `JiraService.refreshAccessToken` pattern exactly.
- **Rate limiting**: On 429, respect the `Retry-After` header with exponential backoff (max 3 retries) — matching `JiraService.jiraFetch`.
- **Callback redirect**: On success (site selected), redirect to `${CLIENT_URL}/integrations?status=success`.
- **Environment variables required**:
  - `CONFLUENCE_CLIENT_ID`
  - `CONFLUENCE_CLIENT_SECRET`
  - `CONFLUENCE_REDIRECT_URI` (default: `http://localhost:5000/api/confluence/callback`)

> **Decision**: Users must explicitly select which Atlassian site to connect when multiple sites are accessible. If Jira and Confluence share the same `cloudId`, they reuse the same `AtlassianIntegration` token record; no duplicate token storage.

---

### RB-28 — Space and Page Hierarchy Discovery

- **List spaces**: `GET /wiki/api/v2/spaces` — returns all spaces accessible to the token.
  - Response includes `id`, `key`, `name`, `type` (global/personal), `homepageId`.
- **List pages in a space**: `GET /wiki/api/v2/spaces/{spaceId}/pages` — returns top-level and nested pages.
  - Support cursor-based pagination (`cursor` / `limit` query params) to retrieve all pages.
  - Response per page: `id`, `title`, `status`, `parentId`, `spaceId`, `createdAt`, `version.number`.
- **List blog posts in a space**: `GET /wiki/api/v2/blogposts?spaceId={spaceId}` — same pagination approach.
- **Hierarchy reconstruction**: The service fetches all pages (following cursor pagination until exhausted), then builds and returns a **nested tree structure** server-side from `parentId` references. Each node in the tree is of shape `{ id, title, parentId, children: [...] }`. The client receives the complete tree without needing to reconstruct it.

> **Decision**: The backend returns a nested tree (not a flat list with `parentId`), so clients can render the hierarchy directly. Only `current` status pages are returned (draft pages excluded via `status=current` filter).

---

### RB-29 — Page Content Fetcher (Confluence V2 API)

- **Fetch page body**: `GET /wiki/api/v2/pages/{pageId}?body-format=storage` — returns content in Confluence storage format (XHTML-like XML).
  - Response: `id`, `title`, `spaceId`, `parentId`, `version`, `body.storage.value`.
- **Fetch blog post body**: `GET /wiki/api/v2/blogposts/{blogpostId}?body-format=storage` — same structure.
- **Fetch inline comments**: `GET /wiki/api/v2/pages/{pageId}/inline-comments` — fetches comments anchored to specific text within a page.
  - Each comment includes `id`, `body.storage.value`, `author`, `createdAt`.
- **Fetch footer comments**: `GET /wiki/api/v2/pages/{pageId}/footer-comments` — fetches general (non-anchored) page comments. Same shape as inline comments.
- **Fetch blog post footer comments**: `GET /wiki/api/v2/blogposts/{blogpostId}/footer-comments`.
- **Both inline and footer comments** are fetched and included for pages and blog posts. They are merged into a single `comments[]` array tagged with `{ type: 'inline' | 'footer' }`.
- The fetcher returns a unified content object: `{ id, title, type, spaceId, parentId, version, body (raw storage XML), comments[] }`.
- **Auto-indexing**: Immediately after fetching and transforming a page or blog post to Markdown, the service calls `indexDocument` from `search.service.ts` to index the document in Elasticsearch under the `confluence-content` index. The indexed document shape is: `{ id, title, type, spaceId, siteUrl, markdown, labels, fetchedAt }`.

---

### RB-30 — HTML/Storage Format to Markdown Transformer

- **Input**: Confluence storage format (XHTML-like XML string from `body.storage.value`).
- **Library**: [`turndown`](https://www.npmjs.com/package/turndown) — already a standard choice; not currently in `package.json` and must be added.
  - TypeScript types via `@types/turndown`.
- **Pre-processing**: Strip Confluence-specific macro tags (e.g., `<ac:structured-macro>`, `<ac:rich-text-body>`, `<ri:attachment>`) that Turndown cannot meaningfully convert. Replace with descriptive placeholder text (e.g., `[Confluence Macro: <name>]`).
- **Post-processing**: Trim leading/trailing whitespace and collapse multiple blank lines to a single blank line.
- **Output**: A clean Markdown string suitable for Elasticsearch indexing.
- **Exposed as**: A pure utility function `transformToMarkdown(html: string): string` in a dedicated `confluence.transformer.ts` utility file.
- **Comments**: Each comment's `body.storage.value` is also transformed and appended to the final Markdown under a `## Comments` section.

---

### RB-31 — Link Resolution and Label/Tag Extraction

#### Link Resolution
- Confluence internal page links use the format `<ri:page ri:content-title="Page Title" />` in storage format, or relative URLs like `/wiki/spaces/KEY/pages/{id}` in rendered HTML.
- After Markdown transformation, scan the output for relative Confluence links (`/wiki/...`) and prepend the canonical site URL (obtained from `accessible-resources[0].url`).
- For `ri:page` references encountered during pre-processing, resolve them to their full URL via `GET /wiki/api/v2/pages?title={title}&spaceKey={key}` lookup, and emit as standard Markdown links.

#### Label/Tag Extraction
- **Fetch labels for a page**: `GET /wiki/api/v2/pages/{pageId}/labels`.
  - Response: array of `{ id, name, prefix }` objects.
- **Fetch labels for a blog post**: `GET /wiki/api/v2/blogposts/{blogpostId}/labels`.
- Labels are returned as `string[]` alongside the transformed content.
- Labels are stored alongside the indexed document in Elasticsearch as a `labels` field (keyword array) to enable faceted filtering.

---

## API Endpoints (Backend)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/confluence/auth` | JWT required | Initiates OAuth2 redirect to Atlassian |
| `GET` | `/api/confluence/callback` | None | Atlassian callback; exchanges code, stores tokens in session, redirects to site-selection UI |
| `GET` | `/api/confluence/sites` | JWT required | Returns available Atlassian sites from session (for site-selection UI) |
| `POST` | `/api/confluence/select-site` | JWT required | Persists selected `cloudId` as AtlassianIntegration; finalises connection |
| `GET` | `/api/confluence/spaces` | JWT required | Lists all accessible Confluence spaces |
| `GET` | `/api/confluence/spaces/:spaceId/pages` | JWT required | Returns full nested page tree for a space |
| `GET` | `/api/confluence/spaces/:spaceId/blogposts` | JWT required | Lists blog posts in a space (paginated) |
| `GET` | `/api/confluence/pages/:pageId` | JWT required | Fetches page content as Markdown + labels; auto-indexes to ES |
| `GET` | `/api/confluence/blogposts/:blogpostId` | JWT required | Fetches blog post content as Markdown + labels; auto-indexes to ES |

All data endpoints return `{ success: true, data: ... }` on success and `{ success: false, message: string }` on error — consistent with Jira and Slack controllers.

---

## Data Model

### Shared Atlassian Integration

The existing `JiraIntegration` model is **replaced** by a new `AtlassianIntegration` model that supports multiple Atlassian products (Jira, Confluence) sharing a single OAuth token per `cloudId`. A user may have multiple `AtlassianIntegration` records if they connect to multiple Atlassian cloud sites.

```prisma
model AtlassianIntegration {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  cloudId         String
  siteUrl         String
  accessToken     String
  refreshToken    String
  jiraEnabled     Boolean  @default(false)
  confluenceEnabled Boolean @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, cloudId])
}
```

- `siteUrl`: canonical site URL (e.g., `https://myorg.atlassian.net`) from `accessible-resources`, required for Confluence link resolution.
- `jiraEnabled` / `confluenceEnabled`: flags indicating which products are connected for this site. Set to `true` when the respective OAuth flow completes for that product.
- `@@unique([userId, cloudId])`: ensures one record per user per Atlassian site, enabling token sharing.

**Migration**: The existing `JiraIntegration` model is replaced. A migration script copies existing `JiraIntegration` rows into `AtlassianIntegration` with `jiraEnabled = true`.

The `User` model relation changes from:
```prisma
jiraIntegration  JiraIntegration?
```
to:
```prisma
atlassianIntegrations AtlassianIntegration[]
```

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `turndown` | HTML/XML → Markdown conversion |
| `@types/turndown` | TypeScript types for Turndown |

No other new runtime dependencies. The Atlassian Confluence V2 API is consumed via native `fetch` (consistent with JiraService).

---

## Environment Variables

Add to `.env.example`:

```
# Confluence
CONFLUENCE_CLIENT_ID=
CONFLUENCE_CLIENT_SECRET=
CONFLUENCE_REDIRECT_URI=
```

---

## Testing Requirements

Each ticket (RB-27 through RB-31) must ship with its own commit that includes:

- **Unit tests** (`*.test.ts` in `backend/src/tests/`): Mock Prisma and `fetch`; cover happy path, 401 refresh, 429 backoff, error cases, transformer edge cases, and label extraction.
- **Integration tests**: Test full request/response cycle using `supertest` (consistent with `auth.test.ts`).
- **E2E tests** (Playwright, `frontend/`): If a frontend integration page exists, cover the OAuth connect flow (mocked callback).

Test files must follow existing naming conventions: `confluence.test.ts`, `confluence.controller.test.ts`.

---

## Delivery Order

| Ticket | Deliverable | Depends On |
|--------|------------|------------|
| chore | Fix any dependency issues (e.g., `turndown` installation, `@types/turndown`) | — |
| RB-27 | OAuth2 flow, `ConfluenceIntegration` model, token storage/refresh | chore |
| RB-28 | Space/page hierarchy discovery endpoints | RB-27 |
| RB-29 | Page + blog post + comment content fetcher | RB-28 |
| RB-30 | Turndown transformer utility | chore |
| RB-31 | Link resolution + label extraction | RB-29, RB-30 |

---

## Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Multiple Atlassian sites | Users explicitly pick the site to connect from a selection UI after the OAuth callback. |
| 2 | Jira + Confluence token sharing | If they share the same `cloudId`, a single `AtlassianIntegration` record is used. `jiraEnabled`/`confluenceEnabled` flags track which products are active. |
| 3 | Hierarchy exposure | Backend returns a nested tree structure; the client receives a fully reconstructed hierarchy. |
| 4 | Elasticsearch indexing | Pages and blog posts are indexed automatically immediately on fetch via `indexDocument`. |
| 5 | Comment scope | Both `inline-comments` and `footer-comments` are fetched and included, tagged with their type. |
