# Technical Specification: Confluence API Integration

## 1. Technical Context

| Dimension | Detail |
|-----------|--------|
| **Language** | TypeScript 5 (strict mode) |
| **Runtime** | Node.js 18+, Express |
| **ORM** | Prisma 5 (PostgreSQL) |
| **Search** | Elasticsearch via `@elastic/elasticsearch` |
| **Session** | `express-session` (already installed) — used for transient OAuth state |
| **Frontend** | React + Vite (TypeScript) |
| **Test framework** | Jest 29 + `ts-jest` + `supertest` |
| **New dependencies** | `turndown`, `@types/turndown` |

---

## 2. Data Model Changes

### 2.1 Replace `JiraIntegration` with `AtlassianIntegration`

The `JiraIntegration` model is replaced by a unified `AtlassianIntegration` model. This is the central data model change for the entire feature.

**New `schema.prisma` additions / changes:**

```prisma
model AtlassianIntegration {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  cloudId           String
  siteUrl           String
  accessToken       String
  refreshToken      String
  jiraEnabled       Boolean  @default(false)
  confluenceEnabled Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([userId, cloudId])
}
```

**`User` model diff:**

```prisma
// Remove:
jiraIntegration  JiraIntegration?

// Add:
atlassianIntegrations AtlassianIntegration[]
```

**`JiraIntegration` model** is deleted from the schema.

### 2.2 Migration Strategy

A Prisma migration is generated that:
1. Creates the `AtlassianIntegration` table.
2. Copies all rows from `JiraIntegration` into `AtlassianIntegration` with `jiraEnabled = true` and a placeholder `siteUrl` (backfilled from the Atlassian accessible-resources API on next Jira token use, or left empty to be populated lazily).
3. Drops the `JiraIntegration` table.

The migration is applied with `prisma migrate dev`.

### 2.3 Jira Service Update

`JiraService` is updated to query `AtlassianIntegration` instead of `JiraIntegration`, filtering by `jiraEnabled = true`. `refreshAccessToken` updates the same `AtlassianIntegration` row. All other logic is unchanged.

---

## 3. Shared Atlassian Auth Infrastructure

### 3.1 `atlassian.auth.ts` (new, refactored from `oauth.ts`)

Extract and generalise the Atlassian token exchange into a shared helper:

```typescript
// backend/src/config/atlassian.auth.ts

export interface AtlassianTokenSet {
  accessToken: string;
  refreshToken: string;
}

export interface AtlassianSite {
  id: string;       // cloudId
  name: string;
  url: string;      // siteUrl
  scopes: string[];
}

export async function exchangeAtlassianCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<AtlassianTokenSet>

export async function getAtlassianSites(accessToken: string): Promise<AtlassianSite[]>
```

Both `jiraCallback` (updated) and `confluenceCallback` (new) call these shared functions, eliminating the duplicated token-exchange code that currently lives in both `oauth.ts` and `jira.controller.ts`.

### 3.2 Session Storage for Transient OAuth State

After the OAuth callback exchanges the code for tokens, the tokens and site list are stored in the Express session under a namespaced key before the user selects a site:

```typescript
req.session.confluenceOAuth = {
  accessToken: string,
  refreshToken: string,
  sites: AtlassianSite[],
};
```

`express-session` is already installed and used in the project. No new middleware is required. Session entries are deleted after `select-site` is called.

---

## 4. Source File Structure

All new files follow the existing `backend/src/<layer>/<integration>.<layer>.ts` naming convention.

```
backend/
  prisma/
    schema.prisma                         ← updated (AtlassianIntegration replaces JiraIntegration)
    migrations/<timestamp>_atlassian/     ← generated migration

  src/
    config/
      atlassian.auth.ts                   ← NEW: shared token exchange + site listing helpers
      oauth.ts                            ← UPDATED: remove handleJiraCallback; Jira callback now lives in jira.controller.ts

    services/
      jira.service.ts                     ← UPDATED: query AtlassianIntegration (jiraEnabled=true)
      confluence.service.ts               ← NEW: ConfluenceService class

    controllers/
      jira.controller.ts                  ← UPDATED: use atlassian.auth.ts helpers; upsert AtlassianIntegration
      confluence.controller.ts            ← NEW: ConfluenceController functions

    routes/
      confluence.routes.ts                ← NEW

    utils/
      confluence.transformer.ts           ← NEW: transformToMarkdown() utility

    tests/
      confluence.service.test.ts          ← NEW
      confluence.controller.test.ts       ← NEW
      confluence.transformer.test.ts      ← NEW
      jira.service.test.ts                ← UPDATED: mock AtlassianIntegration
      jira.controller.test.ts             ← UPDATED: mock AtlassianIntegration

    server.ts                             ← UPDATED: add confluenceRoutes
```

---

## 5. Implementation Detail by Phase

### Phase 0 — Chore: Dependencies and Shared Auth

**Files changed:**
- `backend/package.json` — add `turndown`, `@types/turndown`
- `backend/src/config/atlassian.auth.ts` — create
- `backend/src/config/oauth.ts` — remove `handleJiraCallback` (now redundant)
- `backend/prisma/schema.prisma` — add `AtlassianIntegration`, remove `JiraIntegration`
- `backend/src/services/jira.service.ts` — update to use `AtlassianIntegration`
- `backend/src/controllers/jira.controller.ts` — update to use shared auth helpers and `AtlassianIntegration`

**`atlassian.auth.ts` contract:**

```typescript
export async function exchangeAtlassianCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string }>

export async function getAtlassianSites(
  accessToken: string,
): Promise<Array<{ id: string; name: string; url: string; scopes: string[] }>>

export async function refreshAtlassianToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; refreshToken: string }>
```

**`JiraService` updated `getTokens()`:**

```typescript
private async getTokens() {
  const integration = await prisma.atlassianIntegration.findFirst({
    where: { userId: this.userId, jiraEnabled: true },
  });
  if (!integration) throw new Error('Jira integration not found for user');
  return integration;
}
```

**`refreshAccessToken` in `JiraService`** — updates `atlassianIntegration` row (same `userId`+`cloudId`).

---

### Phase 1 — RB-27: Confluence OAuth2 Flow

**New endpoint handlers** in `confluence.controller.ts`:

#### `initiateConfluenceAuth`
- Reads `CONFLUENCE_CLIENT_ID`, `CONFLUENCE_CLIENT_SECRET`, `CONFLUENCE_REDIRECT_URI` from env.
- Scope: `read:confluence-content.all offline_access`
- Embeds `userId` from JWT in the OAuth `state` param (same pattern as `initiateJiraAuth`).
- Issues `302` redirect to Atlassian authorization URL.

#### `confluenceCallback`
- Extracts `code` and `state` (userId) from query params.
- Calls `exchangeAtlassianCode()` from `atlassian.auth.ts`.
- Calls `getAtlassianSites()` to retrieve available Atlassian sites.
- Stores `{ accessToken, refreshToken, sites }` in `req.session.confluenceOAuth`.
- Redirects to `${CLIENT_URL}/integrations/confluence/select-site`.

#### `getConfluenceSites`
- JWT-protected.
- Reads `req.session.confluenceOAuth.sites` (set during callback).
- Returns `{ success: true, data: sites[] }`.
- Returns 400 if no session data is present (user hasn't gone through OAuth).

#### `selectConfluenceSite`
- JWT-protected.
- Body: `{ cloudId: string }`.
- Reads tokens from session; looks up the site matching `cloudId`.
- Upserts `AtlassianIntegration` with `confluenceEnabled: true`.
  - If a record already exists for `(userId, cloudId)` (i.e., Jira was already connected), merges by updating tokens and setting `confluenceEnabled = true`.
- Clears `req.session.confluenceOAuth`.
- Returns `{ success: true }`.

**Routes** in `confluence.routes.ts`:

```typescript
router.get('/auth', authMiddleware, initiateConfluenceAuth);
router.get('/callback', confluenceCallback);
router.get('/sites', authMiddleware, getConfluenceSites);
router.post('/select-site', authMiddleware, selectConfluenceSite);
```

**`server.ts` addition:**

```typescript
import confluenceRoutes from './routes/confluence.routes';
app.use('/api/confluence', confluenceRoutes);
```

**Environment variables** (add to `.env.example`):
```
CONFLUENCE_CLIENT_ID=
CONFLUENCE_CLIENT_SECRET=
CONFLUENCE_REDIRECT_URI=http://localhost:5000/api/confluence/callback
```

---

### Phase 2 — RB-28: Space and Page Hierarchy Discovery

**`ConfluenceService`** class in `confluence.service.ts`:

```typescript
export class ConfluenceService {
  private userId: string;

  constructor(userId: string) { ... }

  private async getIntegration(): Promise<AtlassianIntegration>
  private async refreshAccessToken(refreshToken: string): Promise<string>
  private async backoff(seconds: number): Promise<void>
  private async confluenceFetch(endpoint: string, options?: RequestInit, retryCount?: number): Promise<any>

  async getSpaces(): Promise<ConfluenceSpace[]>
  async getPageTree(spaceId: string): Promise<PageTreeNode[]>
  async getBlogPosts(spaceId: string): Promise<BlogPostSummary[]>
  async getPage(pageId: string): Promise<ConfluencePageContent>
  async getBlogPost(blogpostId: string): Promise<ConfluencePageContent>
  private async getLabels(type: 'pages' | 'blogposts', id: string): Promise<string[]>
  private async getComments(type: 'pages' | 'blogposts', id: string): Promise<ConfluenceComment[]>
  private async resolvePageLinks(markdown: string, spaceKey: string): Promise<string>
}
```

#### `confluenceFetch(endpoint, options, retryCount)`

Base URL: `https://api.atlassian.com/ex/confluence/{cloudId}{endpoint}`

Mirrors `JiraService.jiraFetch` exactly:
- Retrieves tokens via `getIntegration()`.
- Injects `Authorization: Bearer {accessToken}` header.
- On 429: reads `Retry-After` header; falls back to `2^retryCount` seconds; max 3 retries.
- On 401 with a `refreshToken`: calls `refreshAtlassianToken()`, updates the `AtlassianIntegration` record, retries once.
- On other non-ok responses: throws `Error('Confluence API Error: ...')`.

#### `getSpaces()`

```
GET /wiki/api/v2/spaces
```
Returns: `ConfluenceSpace[]` — `{ id, key, name, type, homepageId }`.

#### `getPageTree(spaceId)`

Algorithm:
1. Fetch all pages with cursor pagination: `GET /wiki/api/v2/spaces/{spaceId}/pages?status=current&limit=250`
2. Follow `_links.next` cursors until exhausted (each page yields `{ id, title, parentId, spaceId, createdAt, version }`).
3. Build nested tree:

```typescript
interface PageTreeNode {
  id: string;
  title: string;
  parentId: string | null;
  createdAt: string;
  version: number;
  children: PageTreeNode[];
}
```

Tree construction:
- Create a `Map<id, PageTreeNode>` from all pages.
- Roots are nodes where `parentId` is `null` or the homepage.
- Attach each non-root node to its parent's `children[]`.
- Return the array of root nodes.

#### `getBlogPosts(spaceId)`

```
GET /wiki/api/v2/blogposts?spaceId={spaceId}&status=current&limit=250
```
Follows cursor pagination. Returns flat `BlogPostSummary[]` — `{ id, title, createdAt, version }`.

**New controller functions** in `confluence.controller.ts`:

```typescript
export const getSpaces = async (req: any, res: Response) => { ... }
export const getPageTree = async (req: any, res: Response) => { ... }   // uses :spaceId
export const getBlogPosts = async (req: any, res: Response) => { ... }  // uses :spaceId
```

**Routes added to `confluence.routes.ts`:**

```typescript
router.get('/spaces', authMiddleware, getSpaces);
router.get('/spaces/:spaceId/pages', authMiddleware, getPageTree);
router.get('/spaces/:spaceId/blogposts', authMiddleware, getBlogPosts);
```

---

### Phase 3 — RB-30: HTML/Storage Format to Markdown Transformer

**`confluence.transformer.ts`** — pure utility, no dependencies on Prisma or fetch.

```typescript
import TurndownService from 'turndown';

export function transformToMarkdown(storageXml: string): string
```

**Implementation steps inside `transformToMarkdown`:**

1. **Pre-processing** (regex + string replacement before Turndown):
   - Replace `<ac:structured-macro ac:name="(name)"[^>]*>[\s\S]*?</ac:structured-macro>` with `[Confluence Macro: $1]`.
   - Strip `<ac:rich-text-body>`, `</ac:rich-text-body>` tags (keep their content).
   - Replace `<ri:attachment ri:filename="(name)" />` with `[Attachment: $1]`.
   - Replace `<ri:page ri:content-title="(title)" />` with a placeholder `[ConfluencePage:(title)]` for later resolution.

2. **Turndown conversion:**
   - Instantiate `TurndownService` with default options.
   - Call `turndownService.turndown(preprocessed)`.

3. **Post-processing:**
   - `output.replace(/\[ConfluencePage:([^\]]+)\]/g, '[$1]($1)')` — placeholder links (resolved later by `resolvePageLinks`).
   - Trim leading/trailing whitespace.
   - Collapse 3+ consecutive blank lines to 2: `output.replace(/\n{3,}/g, '\n\n')`.

---

### Phase 4 — RB-29: Page and Blog Post Content Fetcher

#### `getPage(pageId)` and `getBlogPost(blogpostId)`

Both follow the same pattern:

1. Fetch body: `GET /wiki/api/v2/pages/{pageId}?body-format=storage` (or `/blogposts/{id}?body-format=storage`).
2. Fetch inline comments: `GET /wiki/api/v2/pages/{pageId}/inline-comments` — tagged `{ type: 'inline' }`.
3. Fetch footer comments: `GET /wiki/api/v2/pages/{pageId}/footer-comments` — tagged `{ type: 'footer' }`.
4. For blog posts: only `footer-comments` (no inline-comment endpoint for blog posts).
5. Fetch labels: `GET /wiki/api/v2/pages/{pageId}/labels`.
6. Call `transformToMarkdown(body.storage.value)` for the body.
7. Call `transformToMarkdown(comment.body.storage.value)` for each comment.
8. Append comments as a `## Comments` section: each comment is a `---` delimited block with its transformed Markdown.
9. Call `resolvePageLinks(markdown, spaceKey)` to prepend `siteUrl` to relative `/wiki/...` links.
10. Call `indexDocument('confluence-content', pageId, { id, title, type, spaceId, siteUrl, markdown, labels, fetchedAt: new Date() })`.
11. Return the full `ConfluencePageContent` object.

```typescript
interface ConfluenceComment {
  id: string;
  type: 'inline' | 'footer';
  body: string;          // raw storage XML
  author: string;
  createdAt: string;
}

interface ConfluencePageContent {
  id: string;
  title: string;
  type: 'page' | 'blogpost';
  spaceId: string;
  parentId: string | null;
  version: number;
  rawBody: string;       // storage XML
  markdown: string;      // transformed
  labels: string[];
  comments: ConfluenceComment[];
  fetchedAt: string;
}
```

**Auto-indexing** calls `indexDocument` from `search.service.ts`. The Elasticsearch index is `confluence-content`. The index is created lazily on first use via `createIndex()` if it does not exist, with this mapping:

```json
{
  "mappings": {
    "properties": {
      "id":        { "type": "keyword" },
      "title":     { "type": "text" },
      "type":      { "type": "keyword" },
      "spaceId":   { "type": "keyword" },
      "siteUrl":   { "type": "keyword" },
      "markdown":  { "type": "text" },
      "labels":    { "type": "keyword" },
      "fetchedAt": { "type": "date" }
    }
  }
}
```

**New controller functions:**

```typescript
export const getPage = async (req: any, res: Response) => { ... }      // :pageId
export const getBlogPost = async (req: any, res: Response) => { ... }  // :blogpostId
```

**Routes added:**

```typescript
router.get('/pages/:pageId', authMiddleware, getPage);
router.get('/blogposts/:blogpostId', authMiddleware, getBlogPost);
```

---

### Phase 5 — RB-31: Link Resolution and Label Extraction

#### `resolvePageLinks(markdown, spaceKey)`

Private method on `ConfluenceService`:

1. Fetch `siteUrl` from the `AtlassianIntegration` record.
2. Scan for relative links matching `/wiki/` using regex `\[([^\]]+)\]\((\/wiki\/[^)]+)\)`.
3. Prepend `siteUrl`: replace `(/wiki/...)` with `(${siteUrl}/wiki/...)`.

#### `ri:page` resolution in `transformToMarkdown`

The `[ConfluencePage:(title)]` placeholders inserted by the transformer are resolved post-transformation by a call within `getPage`/`getBlogPost`:

```typescript
private async resolveConfluencePagePlaceholders(
  markdown: string,
  spaceKey: string,
): Promise<string>
```

For each `[ConfluencePage:(title)]` placeholder:
- Call `GET /wiki/api/v2/pages?title={encodedTitle}&spaceKey={spaceKey}&limit=1`.
- If found, replace with `[title](${siteUrl}/wiki/spaces/${spaceKey}/pages/${id})`.
- If not found, leave as `[title]` (no link).

#### Label extraction

`getLabels(type, id)` — already defined in Phase 4. Returns `string[]` from `label.name` of each result.

---

## 6. Complete `confluence.routes.ts`

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  initiateConfluenceAuth,
  confluenceCallback,
  getConfluenceSites,
  selectConfluenceSite,
  getSpaces,
  getPageTree,
  getBlogPosts,
  getPage,
  getBlogPost,
} from '../controllers/confluence.controller';

const router = Router();

router.get('/auth', authMiddleware, initiateConfluenceAuth);
router.get('/callback', confluenceCallback);
router.get('/sites', authMiddleware, getConfluenceSites);
router.post('/select-site', authMiddleware, selectConfluenceSite);
router.get('/spaces', authMiddleware, getSpaces);
router.get('/spaces/:spaceId/pages', authMiddleware, getPageTree);
router.get('/spaces/:spaceId/blogposts', authMiddleware, getBlogPosts);
router.get('/pages/:pageId', authMiddleware, getPage);
router.get('/blogposts/:blogpostId', authMiddleware, getBlogPost);

export default router;
```

---

## 7. Error Handling

All controller functions use the existing try/catch pattern:

```typescript
} catch (error: any) {
  res.status(500).json({ success: false, message: error.message });
}
```

`ConfluenceService` throws typed errors:
- `'Confluence integration not found for user'` — 500 (integration missing).
- `'Confluence API Error: ...'` — propagated from `confluenceFetch`.
- `'No Confluence OAuth session found'` — returned as 400 from `getConfluenceSites`.

---

## 8. Testing Approach

### Unit Tests

#### `confluence.transformer.test.ts`
- Happy path: storage XML with headings, paragraphs, tables → correct Markdown.
- Macro stripping: `<ac:structured-macro>` replaced with `[Confluence Macro: name]`.
- Attachment placeholder: `<ri:attachment>` → `[Attachment: filename]`.
- Page placeholder: `<ri:page>` → `[ConfluencePage:title]`.
- Post-processing: multiple blank lines collapsed to two.
- Empty input → empty string.

#### `confluence.service.test.ts`

Mocks: `@prisma/client` (mock `atlassianIntegration.findFirst`, `.update`, `.upsert`), `global.fetch`.

Tests:
- `getSpaces()`: happy path, 401 refresh, 429 backoff (≤3 retries), integration-not-found throws.
- `getPageTree()`: flat list with parentId → correct nested tree structure; multi-cursor pagination.
- `getBlogPosts()`: cursor pagination followed until exhausted.
- `getPage()`: fetches body + inline + footer comments + labels; calls `transformToMarkdown`; calls `indexDocument`; returns `ConfluencePageContent`.
- `getBlogPost()`: same as `getPage` but footer-comments only.
- `resolvePageLinks()`: relative `/wiki/` links get `siteUrl` prepended; absolute links are untouched.

#### `confluence.controller.test.ts`

Uses `supertest` against the Express app (consistent with `auth.test.ts`).

Tests:
- `GET /api/confluence/auth` → 302 redirect to Atlassian URL with correct scope.
- `GET /api/confluence/callback` with valid code → session set, redirect to select-site UI.
- `GET /api/confluence/sites` → returns sites from session; 400 if no session.
- `POST /api/confluence/select-site` with `cloudId` → upserts `AtlassianIntegration`; clears session; returns 200.
- `POST /api/confluence/select-site` when Jira already connected (same cloudId) → merges, sets `confluenceEnabled = true`, does not overwrite `jiraEnabled`.
- `GET /api/confluence/spaces` → 200 with data; 500 on service error.
- `GET /api/confluence/spaces/:spaceId/pages` → 200 with nested tree.
- `GET /api/confluence/pages/:pageId` → 200 with `{ markdown, labels, comments }`.

#### Updated `jira.service.test.ts`

Update mocks from `jiraIntegration.findUnique` to `atlassianIntegration.findFirst`. All existing test cases remain; only mock target changes.

### Running Tests

```bash
cd backend
npm test                    # jest --coverage
npm run build               # tsc — must pass with 0 errors
```

---

## 9. Delivery Phases

| Phase | Ticket | Deliverables | Depends On |
|-------|--------|--------------|------------|
| 0 | chore | Install `turndown`; create `atlassian.auth.ts`; migrate schema to `AtlassianIntegration`; update `JiraService` and `JiraController` | — |
| 1 | RB-27 | Confluence OAuth flow: `initiateConfluenceAuth`, `confluenceCallback`, `getConfluenceSites`, `selectConfluenceSite`; session-based site selection | Phase 0 |
| 2 | RB-28 | `getSpaces`, `getPageTree` (nested tree), `getBlogPosts`; cursor-pagination in service | Phase 1 |
| 3 | RB-30 | `confluence.transformer.ts` (`transformToMarkdown`); unit tests | Phase 0 |
| 4 | RB-29 | `getPage`, `getBlogPost` with both inline+footer comments; auto-indexing to ES; integrate transformer | Phase 2, Phase 3 |
| 5 | RB-31 | `resolvePageLinks`; `ri:page` placeholder resolution; label extraction wired into responses | Phase 4 |

Each phase ends with `npm run build && npm test` passing before the next begins.

---

## 10. Verification Commands

```bash
# Install new dependencies
cd backend && npm install turndown @types/turndown

# Generate Prisma client after schema changes
npx prisma generate

# Run migration
npx prisma migrate dev --name atlassian_integration

# TypeScript build (zero errors required)
npm run build

# Full test suite with coverage
npm test

# Lint (if configured — check for eslint config)
npx eslint src --ext .ts
```

---

## 11. Open Questions / Risks

| Item | Detail |
|------|--------|
| **Session secret** | `express-session` requires `SESSION_SECRET` env var. Confirm it is already set in `.env`. If not, it must be added. |
| **`siteUrl` backfill for Jira** | Existing `JiraIntegration` rows migrated to `AtlassianIntegration` will have an empty `siteUrl`. `JiraService.generateIssueUrl` fetches the site URL dynamically via `accessible-resources` so this is not blocking, but the field should be backfilled lazily on next token use. |
| **Turndown and XML namespaces** | Confluence storage format uses `ac:` and `ri:` namespaced XML elements. Turndown treats the DOM, so the pre-processing regex approach is needed because browsers/Node's JSDOM are not available without additional deps. Verify that the regex pre-processing covers all macro patterns encountered in practice. |
| **Elasticsearch index creation** | `createIndex` is called inside the service method. If multiple concurrent requests hit an uncreated index simultaneously, there may be a race condition. A one-time bootstrap (e.g., in `startServer`) would be safer, but is out of scope for this feature. |
