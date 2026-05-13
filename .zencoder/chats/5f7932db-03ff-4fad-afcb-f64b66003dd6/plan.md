# Full SDD workflow

## Workflow Steps

### [x] Step: Requirements

Create a Product Requirements Document (PRD) based on the feature description: "Implement Confluence API integration. Fetch pages, blog posts, and comments."

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/5f7932db-03ff-4fad-afcb-f64b66003dd6/requirements.md`.

**Stop here.** Present the PRD to the user and wait for their confirmation before proceeding.

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/5f7932db-03ff-4fad-afcb-f64b66003dd6/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/5f7932db-03ff-4fad-afcb-f64b66003dd6/spec.md` with:

- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

**Stop here.** Present the technical specification to the user and wait for their confirmation before proceeding.

### [x] Step: Planning

Create a detailed implementation plan based on `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/5f7932db-03ff-4fad-afcb-f64b66003dd6/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function) or too broad (entire feature).

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/5f7932db-03ff-4fad-afcb-f64b66003dd6/plan.md`.

**Stop here.** Present the implementation plan to the user and wait for their confirmation before proceeding.

---

## Implementation Tasks

### Phase 0 — Chore: Dependencies, Shared Auth, and Schema Migration

#### [x] Task 0.1 — Install new dependencies

- Install `turndown` and `@types/turndown` in `backend/`:
  ```bash
  cd backend && npm install turndown @types/turndown
  ```
- Verify installation: `npm ls turndown` shows the package in the dependency tree.

**Verification:**
- `cd backend && npm run build` passes with 0 TypeScript errors after install.

---

#### [x] Task 0.2 — Migrate Prisma schema: replace `JiraIntegration` with `AtlassianIntegration`

**Files changed:** `backend/prisma/schema.prisma`

- Delete the `JiraIntegration` model.
- Add the `AtlassianIntegration` model:
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
- Update the `User` model: replace `jiraIntegration JiraIntegration?` with `atlassianIntegrations AtlassianIntegration[]`.
- Generate and apply migration:
  ```bash
  npx prisma migrate dev --name atlassian_integration
  npx prisma generate
  ```
- Write migration SQL to copy existing `JiraIntegration` rows into `AtlassianIntegration` with `jiraEnabled = true` and empty `siteUrl` (to be backfilled lazily).

**Verification:**
- `npx prisma migrate dev` succeeds without errors.
- `npx prisma generate` regenerates the client with the new model.
- `npm run build` passes.

---

#### [x] Task 0.3 — Create `atlassian.auth.ts` shared helper

**File created:** `backend/src/config/atlassian.auth.ts`

Implement and export three async functions (contracts defined in spec §5, Phase 0):
- `exchangeAtlassianCode(code, clientId, clientSecret, redirectUri)` → `{ accessToken, refreshToken }` — calls `https://auth.atlassian.com/oauth/token`.
- `getAtlassianSites(accessToken)` → `AtlassianSite[]` — calls `https://api.atlassian.com/oauth/token/accessible-resources`.
- `refreshAtlassianToken(refreshToken, clientId, clientSecret)` → `{ accessToken, refreshToken }`.

Export TypeScript interfaces `AtlassianTokenSet` and `AtlassianSite`.

**Verification:**
- `npm run build` passes.
- Unit tests: mock `global.fetch`; verify correct request bodies and header construction for all three functions.

---

#### [x] Task 0.4 — Update `JiraService` and `JiraController` to use `AtlassianIntegration`

**Files changed:** `backend/src/services/jira.service.ts`, `backend/src/controllers/jira.controller.ts`, `backend/src/config/oauth.ts`

- In `JiraService`: replace all `prisma.jiraIntegration.*` calls with `prisma.atlassianIntegration.*`, filtering by `jiraEnabled: true`. Update `refreshAccessToken` to update the `atlassianIntegration` row.
- In `JiraController`: replace direct token-exchange logic with calls to `exchangeAtlassianCode` and `getAtlassianSites` from `atlassian.auth.ts`. Upsert `AtlassianIntegration` with `jiraEnabled: true`.
- In `oauth.ts`: remove `handleJiraCallback` if it was centralised there (Jira callback is now self-contained in `jira.controller.ts`).

**Verification:**
- `npm run build` passes.
- Update `backend/src/tests/jira.service.test.ts`: replace `prisma.jiraIntegration.findUnique` mocks with `prisma.atlassianIntegration.findFirst`. All existing test cases must pass.
- Update `backend/src/tests/jira.controller.test.ts`: update mocks similarly.
- `npm test -- --testPathPattern=jira` passes (all Jira tests green).

---

### Phase 1 — RB-27: Confluence OAuth2 Flow

#### [x] Task 1.1 — Implement Confluence OAuth2 controller and routes

**Files created:** `backend/src/controllers/confluence.controller.ts`, `backend/src/routes/confluence.routes.ts`
**File changed:** `backend/src/server.ts`

Implement four handler functions in `confluence.controller.ts`:

1. **`initiateConfluenceAuth`** — reads `CONFLUENCE_CLIENT_ID`, `CONFLUENCE_REDIRECT_URI` from env; embeds `userId` from JWT in `state`; issues 302 redirect to `https://auth.atlassian.com/authorize` with scope `read:confluence-content.all offline_access`.

2. **`confluenceCallback`** — extracts `code` and `state` (userId) from query; calls `exchangeAtlassianCode()` and `getAtlassianSites()`; stores `{ accessToken, refreshToken, sites }` in `req.session.confluenceOAuth`; redirects to `${CLIENT_URL}/integrations/confluence/select-site`.

3. **`getConfluenceSites`** (JWT-protected) — reads `req.session.confluenceOAuth.sites`; returns `{ success: true, data: sites[] }`; returns 400 if session is absent.

4. **`selectConfluenceSite`** (JWT-protected) — body `{ cloudId }`; reads tokens from session; upserts `AtlassianIntegration` with `confluenceEnabled: true` (preserves `jiraEnabled` on existing records); clears `req.session.confluenceOAuth`; returns `{ success: true }`.

Wire routes in `confluence.routes.ts`:
```typescript
router.get('/auth', authMiddleware, initiateConfluenceAuth);
router.get('/callback', confluenceCallback);
router.get('/sites', authMiddleware, getConfluenceSites);
router.post('/select-site', authMiddleware, selectConfluenceSite);
```

Register in `server.ts`:
```typescript
app.use('/api/confluence', confluenceRoutes);
```

Add to `.env.example`:
```
CONFLUENCE_CLIENT_ID=
CONFLUENCE_CLIENT_SECRET=
CONFLUENCE_REDIRECT_URI=http://localhost:5000/api/confluence/callback
```

**Verification:**
- `npm run build` passes.
- Write `backend/src/tests/confluence.controller.test.ts` covering:
  - `GET /api/confluence/auth` → 302 redirect with correct `scope` and `state` params.
  - `GET /api/confluence/callback` with valid code → session populated, redirect to select-site URL.
  - `GET /api/confluence/sites` → 200 with sites; 400 if no session.
  - `POST /api/confluence/select-site` → upserts `AtlassianIntegration`; session cleared; 200.
  - `POST /api/confluence/select-site` when Jira already connected (same `cloudId`) → `confluenceEnabled = true`, `jiraEnabled` unchanged.
- `npm test -- --testPathPattern=confluence.controller` passes.

---

### Phase 2 — RB-28: Space and Page Hierarchy Discovery

#### [ ] Task 2.1 — Implement `ConfluenceService` with space and hierarchy methods

**File created:** `backend/src/services/confluence.service.ts`

Implement the `ConfluenceService` class with the following:

- **Private helpers:**
  - `getIntegration()` — fetches `AtlassianIntegration` where `{ userId, confluenceEnabled: true }`; throws `'Confluence integration not found for user'` if absent.
  - `refreshAccessToken(refreshToken)` — calls `refreshAtlassianToken()` from `atlassian.auth.ts`; updates `atlassianIntegration` record; returns new `accessToken`.
  - `confluenceFetch(endpoint, options?, retryCount?)` — base URL `https://api.atlassian.com/ex/confluence/{cloudId}{endpoint}`; injects `Authorization: Bearer`; handles 401 (refresh + retry once) and 429 (Retry-After backoff, max 3 retries); throws on other non-ok responses.

- **Public methods:**
  - `getSpaces()` — `GET /wiki/api/v2/spaces`; returns `ConfluenceSpace[]` (`{ id, key, name, type, homepageId }`).
  - `getPageTree(spaceId)` — `GET /wiki/api/v2/spaces/{spaceId}/pages?status=current&limit=250`; follows `_links.next` cursor until exhausted; builds and returns nested `PageTreeNode[]` tree from `parentId` references (spec §5 Phase 2 algorithm).
  - `getBlogPosts(spaceId)` — `GET /wiki/api/v2/blogposts?spaceId={spaceId}&status=current&limit=250`; follows cursor pagination; returns flat `BlogPostSummary[]`.

Add the three corresponding controller functions to `confluence.controller.ts`:
```typescript
export const getSpaces = async (req, res) => { ... }
export const getPageTree = async (req, res) => { ... }   // param: spaceId
export const getBlogPosts = async (req, res) => { ... }  // param: spaceId
```

Add routes to `confluence.routes.ts`:
```typescript
router.get('/spaces', authMiddleware, getSpaces);
router.get('/spaces/:spaceId/pages', authMiddleware, getPageTree);
router.get('/spaces/:spaceId/blogposts', authMiddleware, getBlogPosts);
```

**Verification:**
- `npm run build` passes.
- Write `backend/src/tests/confluence.service.test.ts` covering:
  - `getSpaces()`: happy path; 401 triggers refresh + retry; 429 triggers backoff (≤3 retries); integration-not-found throws.
  - `getPageTree()`: flat input with `parentId` references → correct nested tree; multi-page cursor pagination followed until `_links.next` is absent.
  - `getBlogPosts()`: cursor pagination followed until exhausted; returns flat list.
- `npm test -- --testPathPattern=confluence` passes.

---

### Phase 3 — RB-30: HTML/Storage Format to Markdown Transformer

#### [ ] Task 3.1 — Implement `confluence.transformer.ts`

**File created:** `backend/src/utils/confluence.transformer.ts`

Implement and export `transformToMarkdown(storageXml: string): string` as a pure utility function (no Prisma or fetch dependencies).

Steps inside the function (spec §5 Phase 3):
1. **Pre-processing** (regex replacements before Turndown):
   - `<ac:structured-macro ac:name="(name)"...>...</ac:structured-macro>` → `[Confluence Macro: $1]`
   - `<ac:rich-text-body>` / `</ac:rich-text-body>` → removed (content preserved)
   - `<ri:attachment ri:filename="(name)" />` → `[Attachment: $1]`
   - `<ri:page ri:content-title="(title)" />` → `[ConfluencePage:(title)]`
2. **Turndown conversion**: instantiate `TurndownService` with defaults; call `turndown(preprocessed)`.
3. **Post-processing**:
   - Replace `[ConfluencePage:(title)]` placeholders → `[title](title)` (temporary; resolved later by service).
   - Trim leading/trailing whitespace.
   - Collapse 3+ consecutive newlines → `\n\n`.

**Verification:**
- `npm run build` passes.
- Write `backend/src/tests/confluence.transformer.test.ts` covering:
  - Happy path: storage XML with headings, paragraphs, and tables → correct Markdown output.
  - Macro stripping: `<ac:structured-macro ac:name="code">` → `[Confluence Macro: code]`.
  - Attachment placeholder: `<ri:attachment ri:filename="doc.pdf" />` → `[Attachment: doc.pdf]`.
  - Page placeholder: `<ri:page ri:content-title="My Page" />` → `[My Page](My Page)`.
  - Post-processing: input with 4 consecutive blank lines → output has at most 2.
  - Empty string input → empty string output.
- `npm test -- --testPathPattern=confluence.transformer` passes.

---

### Phase 4 — RB-29: Page and Blog Post Content Fetcher

#### [ ] Task 4.1 — Implement `getPage` and `getBlogPost` in `ConfluenceService`

**File changed:** `backend/src/services/confluence.service.ts`

Add private helpers:
- `getLabels(type: 'pages' | 'blogposts', id: string): Promise<string[]>` — `GET /wiki/api/v2/{type}/{id}/labels`; returns `label.name` values as `string[]`.
- `getComments(type: 'pages' | 'blogposts', id: string): Promise<ConfluenceComment[]>` — for `pages`: fetches both `/inline-comments` (tagged `type: 'inline'`) and `/footer-comments` (tagged `type: 'footer'`); for `blogposts`: fetches only `/footer-comments`. Merges into a single array.
- `resolvePageLinks(markdown: string, spaceKey: string): Promise<string>` — prepends `siteUrl` to all relative `/wiki/...` links using regex `\[([^\]]+)\]\((\/wiki\/[^)]+)\)`.
- `resolveConfluencePagePlaceholders(markdown: string, spaceKey: string): Promise<string>` — for each `[ConfluencePage:(title)]` placeholder, calls `GET /wiki/api/v2/pages?title={encodedTitle}&spaceKey={spaceKey}&limit=1`; replaces with `[title](${siteUrl}/wiki/spaces/${spaceKey}/pages/${id})` if found, else `[title]`.

Add public methods:
- `getPage(pageId: string): Promise<ConfluencePageContent>` — 10-step flow (spec §5 Phase 4): fetch body, fetch inline + footer comments, fetch labels, transform body to Markdown, transform each comment body, append `## Comments` section, resolve page links, resolve placeholders, call `indexDocument('confluence-content', ...)`, return `ConfluencePageContent`.
- `getBlogPost(blogpostId: string): Promise<ConfluencePageContent>` — same as `getPage` but uses `/blogposts/{id}` endpoints and fetches only footer comments.

Define and export TypeScript interfaces in `confluence.service.ts`:
```typescript
interface ConfluenceComment { id, type, body, author, createdAt }
interface ConfluencePageContent { id, title, type, spaceId, parentId, version, rawBody, markdown, labels, comments, fetchedAt }
```

Add Elasticsearch index creation (lazy) before the first `indexDocument` call, with mapping defined in spec §5 Phase 4.

Add controller functions to `confluence.controller.ts`:
```typescript
export const getPage = async (req, res) => { ... }       // param: pageId
export const getBlogPost = async (req, res) => { ... }   // param: blogpostId
```

Add routes to `confluence.routes.ts`:
```typescript
router.get('/pages/:pageId', authMiddleware, getPage);
router.get('/blogposts/:blogpostId', authMiddleware, getBlogPost);
```

**Verification:**
- `npm run build` passes.
- Extend `confluence.service.test.ts`:
  - `getPage()`: mocks for body fetch, inline comments, footer comments, labels; verifies `transformToMarkdown` is called; verifies `indexDocument` is called with correct shape; verifies returned `ConfluencePageContent`.
  - `getBlogPost()`: same, confirms only footer-comments endpoint is called (not inline-comments).
- Extend `confluence.controller.test.ts`:
  - `GET /api/confluence/pages/:pageId` → 200 with `{ markdown, labels, comments }`.
  - `GET /api/confluence/blogposts/:blogpostId` → 200 with correct response.
- `npm test -- --testPathPattern=confluence` passes.

---

### Phase 5 — RB-31: Link Resolution and Label Extraction

#### [ ] Task 5.1 — Wire link resolution and label extraction end-to-end

**Files changed:** `backend/src/services/confluence.service.ts`, `backend/src/utils/confluence.transformer.ts`

This phase verifies that link resolution and label extraction (implemented as private helpers in Task 4.1) are correctly integrated and tested in isolation:

- **`resolvePageLinks`**: confirm that relative `/wiki/...` Markdown links get `siteUrl` prepended; absolute links remain unchanged.
- **`resolveConfluencePagePlaceholders`**: confirm that `[ConfluencePage:(title)]` placeholders are resolved via API lookup or gracefully degraded to `[title]` when not found.
- **Labels**: confirm that `getLabels()` results flow through to the `labels` field in `ConfluencePageContent` and to the Elasticsearch document.

**Verification:**
- Extend `confluence.service.test.ts`:
  - `resolvePageLinks()`: relative `/wiki/spaces/KEY/pages/123` → `${siteUrl}/wiki/spaces/KEY/pages/123`; `https://...` unchanged.
  - `resolveConfluencePagePlaceholders()`: found page → full URL link; not found → plain `[title]`.
  - `getLabels()`: API returns `[{ name: 'foo' }, { name: 'bar' }]` → returns `['foo', 'bar']`.
  - Full `getPage()` integration: labels, resolved links, and resolved placeholders all appear correctly in the returned object and in the `indexDocument` call.
- `npm run build && npm test` both pass with 0 errors.

---

### Final Verification

After all phases are complete:

```bash
cd backend
npm run build       # TypeScript compile — must exit 0
npm test            # Jest full suite — all tests pass, no regressions in Jira tests
npx eslint src --ext .ts   # Lint — 0 errors (if ESLint is configured)
```

Confirm:
- All new test files (`confluence.controller.test.ts`, `confluence.service.test.ts`, `confluence.transformer.test.ts`) exist and pass.
- Updated test files (`jira.service.test.ts`, `jira.controller.test.ts`) still pass.
- No `JiraIntegration` references remain anywhere in `src/` (use `grep -r JiraIntegration backend/src`).
- `AtlassianIntegration` is the only Atlassian token model in the schema.
