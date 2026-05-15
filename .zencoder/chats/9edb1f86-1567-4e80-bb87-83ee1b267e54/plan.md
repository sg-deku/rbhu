# Full SDD workflow

## Workflow Steps

### [x] Step: Requirements

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/9edb1f86-1567-4e80-bb87-83ee1b267e54/requirements.md`.

**Stop here.** Present the PRD to the user and wait for their confirmation before proceeding.

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/9edb1f86-1567-4e80-bb87-83ee1b267e54/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/9edb1f86-1567-4e80-bb87-83ee1b267e54/spec.md` with:

- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

**Stop here.** Present the technical specification to the user and wait for their confirmation before proceeding.

### [x] Step: Planning (complete)

Create a detailed implementation plan based on `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/9edb1f86-1567-4e80-bb87-83ee1b267e54/spec.md`.

Save to `/Users/sushmitghosh/Desktop/Projects/rbhu/.zencoder/chats/9edb1f86-1567-4e80-bb87-83ee1b267e54/plan.md`.

**Stop here.** Present the implementation plan to the user and wait for their confirmation before proceeding.

---

## Implementation Phases

> All paths are relative to the git worktree root: `/Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4`
>
> **Codebase notes (validated)**:
> - Backend: Express + Prisma (`backend/src/config/database.ts` exports `prisma` default) + JWT (`authMiddleware` attaches `req.userId`)
> - Frontend: React 18 + Vite 5, no router yet; `useAuth()` from `frontend/src/context/AuthContext.tsx`; `api` helper in `frontend/src/services/api.ts`
> - Backend tests: Jest + Supertest pattern in `backend/src/tests/auth.test.ts`
> - E2E: Playwright, `testDir: './e2e'`, `baseURL: 'http://localhost:3000'`
> - No vitest configured yet in frontend

---

### [x] Phase 1 — RB-47: Integration Cards with Status Indicators

**Goal**: Render `/settings/integrations` with three cards (Jira, Slack, Confluence) showing status badges. Backend returns integration list from `GET /api/integrations`. Frontend has routing, auth guard, and card UI.

#### Setup / Dependencies

- [ ] In `backend/`, install new dependencies:
  ```
  npm install axios node-cron
  npm install --save-dev @types/node-cron
  ```
- [ ] In `frontend/`, install new dependencies:
  ```
  npm install react-router-dom date-fns
  npm install --save-dev @types/react-router-dom @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest jsdom
  ```
- [ ] Add vitest configuration to `frontend/vite.config.ts`:
  - Add `test` block: `{ environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] }`
  - Import `defineConfig` from `vitest/config` or use inline `/// <reference types="vitest" />`
- [ ] Create `frontend/src/test-setup.ts` that imports `@testing-library/jest-dom`
- [ ] Add `"test": "vitest run"` to `frontend/package.json` scripts
- [ ] Create `frontend/e2e/` directory (Playwright testDir)

#### Backend

- [ ] **Add Prisma schema** — Edit `backend/prisma/schema.prisma`:
  - Add enums: `IntegrationProvider { jira slack confluence }`, `IntegrationStatus { connected error disconnected }`, `SyncStatus { idle syncing success failed }`, `IntegrationEventType { sync_success sync_failed connected disconnected config_updated }`
  - Add model `Integration`: fields `id` (cuid), `userId` (String FK→User.id), `provider` (IntegrationProvider), `status` (IntegrationStatus @default(disconnected)), `accessToken` (String), `refreshToken` (String?), `tokenExpiresAt` (DateTime?), `accountId` (String?), `accountName` (String?), `accountEmail` (String?), `syncStatus` (SyncStatus @default(idle)), `lastSyncedAt` (DateTime?), `syncedItemCount` (Int?), `createdAt` (@default(now())), `updatedAt` (@updatedAt); relations to `User`, `IntegrationConfig?`, `IntegrationActivity[]`; `@@unique([userId, provider])`, `@@index([userId])`
  - Add model `IntegrationConfig`: `id` (cuid), `integrationId` (String @unique FK→Integration.id), `selectedResourceIds` (String[]), `updatedAt` (@updatedAt)
  - Add model `IntegrationActivity`: `id` (cuid), `integrationId` (String FK→Integration.id), `userId` (String FK→User.id), `provider` (IntegrationProvider), `eventType` (IntegrationEventType), `message` (String), `detail` (String?), `syncedItemCount` (Int?), `createdAt` (@default(now())); `@@index([userId])`, `@@index([integrationId])`
  - Add relation fields to `User` model: `integrations Integration[]`, `activities IntegrationActivity[]`
- [ ] Run `cd backend && npx prisma migrate dev --name add-integrations && npx prisma generate`
- [ ] Create `backend/src/utils/encryption.ts`:
  - Export `encrypt(plaintext: string): string` — AES-256-GCM using `process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY` (32-byte hex → `Buffer.from(key, 'hex')`), `randomBytes(12)` IV; returns `iv:tag:ciphertext` hex joined by `:`
  - Export `decrypt(ciphertext: string): string` — splits on `:`, reverses above
- [ ] Create `backend/src/utils/oauth-state.ts`:
  - Export `generateOAuthState(userId: string, provider: string): string` — `jwt.sign({ userId, provider, nonce: randomBytes(16).toString('hex') }, JWT_SECRET, { expiresIn: '10m' })`
  - Export `verifyOAuthState(state: string): { userId: string; provider: string }` — `jwt.verify(state, JWT_SECRET)`
- [ ] Create `backend/src/config/integrations.ts`:
  - Export `getProviderConfig(provider: 'jira' | 'slack' | 'confluence'): ProviderConfig` returning `{ clientId, clientSecret, redirectUri, authorizationUrl, tokenUrl, scopes, revokeUrl? }` for each provider (Slack reads `SLACK_*`, Jira reads `JIRA_CLIENT_ID || ATLASSIAN_CLIENT_ID`, same pattern for Confluence)
- [ ] Create `backend/src/services/integration.service.ts` with only `getIntegrations(userId: string)`:
  - Query `prisma.integration.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })`
  - Return `IntegrationDTO[]` stripping `accessToken`/`refreshToken` fields
- [ ] Create `backend/src/controllers/integration.controller.ts` with `listIntegrations` handler:
  - `GET /api/integrations` — calls `getIntegrations(req.userId)`, returns `{ success: true, data }`
  - Stub handlers for all other endpoints (return `{ success: false, message: 'Not implemented' }` with 501) so routes register without errors: `initiateConnect`, `handleCallback`, `syncNow`, `getStatus`, `deleteIntegration`, `getResources`, `getConfig`, `updateConfig`, `listActivity`
- [ ] Create `backend/src/validators/integration.validator.ts`:
  - Export `validateProvider` middleware: checks `req.params.provider` ∈ `['jira','slack','confluence']`; returns 400 `{ success: false, message: 'Invalid provider' }` if not
- [ ] Create `backend/src/routes/integration.routes.ts`:
  - All routes use `authMiddleware` except `handleCallback` (uses state JWT)
  - `GET /` → `listIntegrations`
  - `POST /:provider/connect` → `validateProvider`, `initiateConnect`
  - `GET /:provider/callback` → `validateProvider`, `handleCallback`
  - `GET /:provider/status` → `validateProvider`, `getStatus`
  - `POST /:provider/sync` → `validateProvider`, `syncNow`
  - `DELETE /:provider` → `validateProvider`, `deleteIntegration`
  - `GET /:provider/resources` → `validateProvider`, `getResources`
  - `GET /:provider/config` → `validateProvider`, `getConfig`
  - `PUT /:provider/config` → `validateProvider`, `updateConfig`
  - `GET /activity` → `listActivity`
  - **Important**: register `/activity` route BEFORE `/:provider/*` routes to avoid param conflict
- [ ] Edit `backend/src/server.ts`:
  - Import `integrationRoutes from './routes/integration.routes'`
  - Add `app.use('/api/integrations', integrationRoutes)` after existing routes
- [ ] Add integration env vars to `.env.example` (append after existing vars):
  ```
  ATLASSIAN_CLIENT_ID=
  ATLASSIAN_CLIENT_SECRET=
  ATLASSIAN_REDIRECT_URI=
  JIRA_CLIENT_ID=
  JIRA_CLIENT_SECRET=
  JIRA_REDIRECT_URI=
  CONFLUENCE_CLIENT_ID=
  CONFLUENCE_CLIENT_SECRET=
  CONFLUENCE_REDIRECT_URI=
  SLACK_CLIENT_ID=
  SLACK_CLIENT_SECRET=
  SLACK_REDIRECT_URI=
  INTEGRATION_TOKEN_ENCRYPTION_KEY=
  ```

#### Frontend

- [ ] Create `frontend/src/types/integrations.ts`:
  - Export types: `Provider = 'jira' | 'slack' | 'confluence'`, `IntegrationStatus`, `SyncStatus`, `IntegrationDTO` (id, provider, status, accountName, accountEmail, syncStatus, lastSyncedAt, syncedItemCount, createdAt, updatedAt — NO token fields), `ActivityDTO` (id, provider, eventType, message, detail, syncedItemCount, createdAt), `ResourceDTO` (id, name, type, metadata?)
- [ ] Create `frontend/src/services/integration.service.ts`:
  - `getIntegrations(): Promise<IntegrationDTO[]>` — calls `api.get('/integrations')`, returns `data`
  - Stub remaining methods for later phases (each returning a typed Promise stub)
- [ ] Create `frontend/src/stores/useIntegrationsStore.ts` (Zustand):
  - State: `integrations: IntegrationDTO[]`, `loading: boolean`
  - Action: `fetchIntegrations()` — calls `integrationService.getIntegrations()`, sets `integrations`
  - Actions for later phases stubbed (empty implementations)
- [ ] Create `frontend/src/components/integrations/StatusBadge.tsx`:
  - Props: `status: IntegrationStatus`
  - Renders a `<span>` with Tailwind color classes: Connected=`bg-green-100 text-green-700`, Error=`bg-red-100 text-red-700`, Disconnected=`bg-gray-100 text-gray-500`
  - Uses `cn()` utility (import `clsx` + `tailwind-merge` pattern matching existing code)
- [ ] Create `frontend/src/lib/utils.ts` (if not already present):
  - Export `cn(...inputs: ClassValue[]) => string` using `clsx` + `twMerge`
- [ ] Create `frontend/src/components/integrations/IntegrationCard.tsx`:
  - Props: `provider: Provider`, `integration: IntegrationDTO | null`, `onConnect`, `onDisconnect`, `onSyncNow`, `onConfigure` (all stubs for later phases)
  - Shows provider logo (SVG inline or `<img>` from public/), name, description, `<StatusBadge status={integration?.status ?? 'disconnected'} />`
  - If connected: show `accountName` or `accountEmail`
  - Card style: `bg-white rounded-lg shadow border border-gray-200 p-6`
  - "Connect" button visible when not connected; "Disconnect", "Sync Now", "Configure" visible when connected (stubs — onClick calls no-op for Phase 1)
- [ ] Create `frontend/src/pages/settings/IntegrationsPage.tsx`:
  - On mount: call `store.fetchIntegrations()`
  - Read `useSearchParams()`: if `?connected=<provider>` show success toast stub; if `?error=<provider>&reason=...` show error toast stub
  - Render three `<IntegrationCard>` components (jira, slack, confluence); find matching integration from store by provider
  - Grid layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
  - Shows loading spinner while `store.loading`
- [ ] Edit `frontend/src/App.tsx`:
  - Wrap entire app in `<BrowserRouter>` + `<AuthProvider>` (AuthProvider already wraps from main.tsx — check and avoid double-wrapping)
  - Add `<Routes>`: `/login` → `<Login>`, `/register` → `<Register>`, `/` → `<Home>`, `/settings/integrations` → `<ProtectedRoute><IntegrationsPage /></ProtectedRoute>`
  - Create inline `ProtectedRoute` component: reads `useAuth()`, if `!token && !loading` redirect to `/login` via `<Navigate to="/login" replace />`
  - Import `BrowserRouter`, `Routes`, `Route`, `Navigate` from `react-router-dom`
- [ ] Edit `frontend/src/main.tsx` if `AuthProvider` is there — move it to `App.tsx` or keep consistent (no double wrap)

#### Tests

- [ ] Create `backend/src/tests/integration-service.test.ts` (Jest unit tests):
  - Mock `../config/database` (prisma) with `jest.mock`
  - Test `getIntegrations(userId)`: mocked `prisma.integration.findMany` returns array → service returns DTO array without token fields
  - Test `getIntegrations(userId)`: empty result → returns `[]`
- [ ] Create `backend/src/tests/integration.test.ts` (Jest + Supertest integration tests):
  - `GET /api/integrations` without token → 401
  - `GET /api/integrations` with valid JWT (sign with `JWT_SECRET`) → 200, `{ success: true, data: [] }` (mock prisma to return empty)
  - `GET /api/integrations/invalid/status` → 400 (invalid provider validation)
- [ ] Create `frontend/src/__tests__/IntegrationCard.test.tsx` (Vitest + Testing Library):
  - Test renders with `integration=null` → shows "Not Connected" badge, "Connect" button
  - Test renders with `integration` having `status='connected'` → shows "Connected" badge, accountName visible
  - Test renders with `integration` having `status='error'` → shows "Error" badge
- [ ] Create `frontend/src/__tests__/StatusBadge.test.tsx`:
  - Test each status value renders correct CSS class and label text
- [ ] Create `frontend/e2e/integrations.spec.ts` (Playwright E2E):
  - Helper: login via API call and set `localStorage.token`
  - Navigate to `/settings/integrations` as logged-in user
  - Assert three cards visible with provider names (Jira, Slack, Confluence)
  - Assert each card shows a status badge
  - Unauthenticated: navigate to `/settings/integrations` → redirected to `/login`

#### Verification

- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm test`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm test`
- [ ] Commit: `git -C /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4 commit -m "feat(RB-47): integration cards with status indicators"`

---

### [x] Phase 2 — RB-48: Connect Modals and OAuth Redirect Handling

**Goal**: Full OAuth connect flow. "Connect" opens modal showing scopes → confirm → redirect to provider OAuth URL. Callback exchanges code for tokens, encrypts and persists them, redirects browser back to `/settings/integrations?connected=<provider>`.

#### Backend

- [ ] Implement `initiateOAuth(userId: string, provider: Provider)` in `backend/src/services/integration.service.ts`:
  - Call `generateOAuthState(userId, provider)` from `oauth-state.ts`
  - Call `getProviderConfig(provider)` from `config/integrations.ts`
  - Build authorization URL: `${config.authorizationUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${config.scopes.join('%20')}&response_type=code&state=${state}&prompt=consent`
  - For Atlassian providers add `&audience=api.atlassian.com`
  - Return `{ authorizationUrl }`
- [ ] Implement `handleCallback(code: string, state: string)` in `backend/src/services/integration.service.ts`:
  - Call `verifyOAuthState(state)` → `{ userId, provider }`
  - `axios.post(config.tokenUrl, { code, grant_type: 'authorization_code', client_id, client_secret, redirect_uri })` with `Content-Type: application/x-www-form-urlencoded`
  - Encrypt `accessToken` and `refreshToken` using `encrypt()` from `encryption.ts`
  - Extract `accountName` and `accountEmail` from token response (provider-specific fields: Slack → `team.name` + `authed_user.id`; Atlassian → fetch `https://api.atlassian.com/me` with access token)
  - `prisma.integration.upsert({ where: { userId_provider }, create: { ... }, update: { ... } })` with `status: 'connected'`, `syncStatus: 'idle'`
  - Log `connected` activity via `prisma.integrationActivity.create({ ... })`
  - Return `{ userId, provider }` for redirect
- [ ] Implement `initiateConnect` controller handler in `backend/src/controllers/integration.controller.ts`:
  - Calls `initiateOAuth(req.userId, req.params.provider as Provider)`
  - Returns `{ success: true, data: { authorizationUrl } }`
- [ ] Implement `handleCallback` controller handler:
  - On `req.query.error`: extract `state`, call `verifyOAuthState(state)` to get `provider`, redirect to `${CLIENT_URL}/settings/integrations?error=${provider}&reason=${encodeURIComponent(req.query.error_description || 'access_denied')}`
  - On `req.query.code + req.query.state`: call `handleCallback(code, state)`, redirect to `${CLIENT_URL}/settings/integrations?connected=${provider}`
  - Catch: redirect to `${CLIENT_URL}/settings/integrations?error=unknown&reason=callback_failed`
- [ ] Note: `handleCallback` route must NOT use `authMiddleware` (user is identified via state JWT)

#### Frontend

- [ ] Create `frontend/src/components/ui/Toast.tsx`:
  - Simple toast component using Framer Motion for enter/exit animation
  - Props: `message: string`, `type: 'success' | 'error'`, `onDismiss: () => void`
  - Fixed bottom-right position, auto-dismiss after 4 seconds
- [ ] Create `frontend/src/components/integrations/ConnectModal.tsx`:
  - Uses `@radix-ui/react-dialog` (`Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`)
  - Props: `open: boolean`, `provider: Provider`, `onConfirm: () => void`, `onCancel: () => void`, `loading?: boolean`
  - Shows provider name, list of OAuth scopes (defined per provider: Slack → `['channels:read', 'groups:read', 'users:read']`; Jira → `['read:jira-work', 'read:jira-user']`; Confluence → `['read:confluence-space.summary', 'read:confluence-content.all']`)
  - "Connect" button calls `onConfirm`; "Cancel" calls `onCancel`; button shows spinner when `loading=true`
- [ ] Add `initiateConnect(provider: Provider): Promise<string>` to `frontend/src/services/integration.service.ts`:
  - `POST /integrations/${provider}/connect` → returns `data.authorizationUrl: string`
- [ ] Update `frontend/src/stores/useIntegrationsStore.ts`:
  - Add `connectingProvider: Provider | null` state
  - Add `connect(provider: Provider): Promise<void>` action:
    - Set `connectingProvider = provider`
    - Call `integrationService.initiateConnect(provider)` → `authorizationUrl`
    - Set `window.location.href = authorizationUrl`
    - Catch: show error (add `errorMessage: string | null` state, set it)
- [ ] Update `frontend/src/components/integrations/IntegrationCard.tsx`:
  - "Connect" button onClick calls `onConnect(provider)` (no longer no-op)
  - Shows spinner if `connectingProvider === provider`
- [ ] Update `frontend/src/pages/settings/IntegrationsPage.tsx`:
  - Add `ConnectModal` state: `connectingModalProvider: Provider | null`
  - Pass real `onConnect` handler to `IntegrationCard`: sets `connectingModalProvider`
  - Render `<ConnectModal>` controlled by `connectingModalProvider`
  - On confirm: call `store.connect(provider)`; close modal
  - Add `<Toast>` for `?connected=<provider>` and `?error=<provider>&reason=...` query params (read via `useSearchParams`, clear params after showing)

#### Tests

- [ ] Add to `backend/src/tests/integration-service.test.ts`:
  - Test `initiateOAuth('user1', 'slack')` returns `authorizationUrl` containing `slack.com/oauth`
  - Test `handleCallback` with mocked `axios.post` returning token response → `prisma.integration.upsert` called with encrypted tokens; `prisma.integrationActivity.create` called with `eventType: 'connected'`
  - Test `encrypt`/`decrypt` roundtrip: `decrypt(encrypt('secret')) === 'secret'`
  - Test `generateOAuthState`/`verifyOAuthState` roundtrip returns correct userId and provider
- [ ] Add to `backend/src/tests/integration.test.ts`:
  - `POST /api/integrations/slack/connect` with valid JWT → 200 + `{ success: true, data: { authorizationUrl: string } }` (mock `initiateOAuth`)
  - `GET /api/integrations/slack/callback?error=access_denied&state=<valid-state>` → 302 redirect to `*?error=slack*`
  - `GET /api/integrations/slack/callback?code=testcode&state=<valid-state>` → 302 redirect to `*?connected=slack*` (mock `axios.post`)
- [ ] Add to `frontend/src/__tests__/ConnectModal.test.tsx`:
  - Renders with `open=true, provider='slack'` → modal visible with Slack scopes listed
  - Renders with `provider='jira'` → shows Jira scopes
  - Click "Cancel" → `onCancel` called
  - Click "Connect" → `onConfirm` called
  - `loading=true` → button disabled + spinner visible
- [ ] Add to `frontend/e2e/integrations-connect.spec.ts` (Playwright):
  - Login, navigate to `/settings/integrations`
  - Click "Connect" on Slack card → `ConnectModal` appears with "Connect to Slack" heading
  - Click "Connect" in modal → browser navigates to Slack OAuth URL (intercept with `page.route('https://slack.com/oauth/**', ...)` returning 200 to prevent actual redirect)
  - Simulate callback: navigate to `/settings/integrations?connected=slack` → success toast visible, Slack card shows "Connected"

#### Verification

- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm test`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm test`
- [ ] Commit: `git -C /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4 commit -m "feat(RB-48): connect modals and OAuth redirect handling"`

---

### [x] Phase 3 — RB-49: Sync Progress Indicator

**Goal**: Show last sync time and current sync status per connected integration. "Sync Now" button triggers on-demand sync. Status polled every 10 seconds while any sync is in progress. Background scheduler runs every 30 minutes.

#### Backend

- [ ] Create `backend/src/services/integration-sync.service.ts`:
  - Export `refreshTokenIfNeeded(integration: Integration): Promise<Integration>`:
    - If `tokenExpiresAt` is within 5 minutes: `axios.post(config.tokenUrl, { grant_type: 'refresh_token', refresh_token: decrypt(integration.refreshToken), ... })`
    - Encrypt new tokens, update `prisma.integration.update()`; return updated record
    - If no refreshToken or provider doesn't support refresh: return integration unchanged
  - Export `syncSlack(integration: Integration): Promise<{ syncedItemCount: number }>`:
    - Ensure fresh token via `refreshTokenIfNeeded`
    - `axios.get('https://slack.com/api/conversations.list', { headers: { Authorization: Bearer ${decrypt(integration.accessToken)} } })`
    - Return `{ syncedItemCount: response.data.channels.length }`
  - Export `syncJira(integration: Integration): Promise<{ syncedItemCount: number }>`:
    - Fetch `https://api.atlassian.com/oauth/token/accessible-resources` to get cloudId
    - `axios.get(https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project, { headers: { Authorization: Bearer ${...} } })`
    - Return `{ syncedItemCount: projects.length }`
  - Export `syncConfluence(integration: Integration): Promise<{ syncedItemCount: number }>`:
    - Fetch accessible resources, then `axios.get(https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/space)`
    - Return `{ syncedItemCount: spaces.length }`
  - Export `runSync(integration: Integration): Promise<void>` (dispatches to correct provider sync fn)
- [ ] Add `syncIntegration(userId: string, provider: Provider): Promise<{ jobId: string }>` to `backend/src/services/integration.service.ts`:
  - Find integration, set `syncStatus: 'syncing'` in DB
  - Log `IntegrationActivity` with `eventType: 'sync_success'` stub (written after async completes)
  - Run sync async (fire-and-forget with `.then().catch()`):
    - On success: update `syncStatus: 'success'`, `lastSyncedAt: new Date()`, `syncedItemCount`; log `sync_success` activity
    - On failure: update `syncStatus: 'failed'`; log `sync_failed` activity with `detail: error.message`
  - Return `{ jobId: integration.id, status: 'queued' }` immediately
- [ ] Add `getIntegrationStatus(userId: string, provider: Provider)` to `backend/src/services/integration.service.ts`:
  - `prisma.integration.findUnique({ where: { userId_provider: { userId, provider } } })`
  - Return `{ status: syncStatus, lastSyncedAt, syncedItemCount }` or 404 if not found
- [ ] Add `syncAllIntegrations()` export to `backend/src/services/integration.service.ts`:
  - `prisma.integration.findMany({ where: { status: 'connected' } })`
  - For each: call `syncIntegration(integration.userId, integration.provider)` (swallow errors per integration)
- [ ] Create `backend/src/services/integration-scheduler.ts`:
  - Import `cron from 'node-cron'` and `{ syncAllIntegrations }` from `integration.service`
  - Export `startIntegrationScheduler(): void` → `cron.schedule('*/30 * * * *', async () => { await syncAllIntegrations() })`
- [ ] Implement `getStatus` controller handler in `backend/src/controllers/integration.controller.ts`:
  - Call `getIntegrationStatus(req.userId, provider)`, return 200 or 404
- [ ] Implement `syncNow` controller handler:
  - Call `syncIntegration(req.userId, provider)`, return `{ success: true, data: { jobId, status: 'queued' } }`
- [ ] Edit `backend/src/server.ts`:
  - Import `{ startIntegrationScheduler }` from `./services/integration-scheduler`
  - Call `startIntegrationScheduler()` inside `startServer()` after `await connectDB()`

#### Frontend

- [ ] Create `frontend/src/components/integrations/SyncStatusIndicator.tsx`:
  - Props: `syncStatus: SyncStatus`, `lastSyncedAt: string | null`
  - Renders sync badge with colors: Idle=`bg-gray-100 text-gray-500`, Syncing=`bg-blue-100 text-blue-700` + animated spinner icon, Success=`bg-green-100 text-green-700`, Failed=`bg-red-100 text-red-700`
  - Shows relative timestamp: `formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })` from `date-fns` when `lastSyncedAt` is non-null
- [ ] Add `triggerSync(provider: Provider)` to `frontend/src/services/integration.service.ts`:
  - `POST /integrations/${provider}/sync` → returns `{ jobId, status }`
- [ ] Update `frontend/src/stores/useIntegrationsStore.ts`:
  - Add `syncingProviders: Set<Provider>` state (initialized as `new Set()`)
  - Add `triggerSync(provider: Provider): Promise<void>` action:
    - Add `provider` to `syncingProviders`
    - Call `integrationService.triggerSync(provider)`
    - Optimistically update integration `syncStatus` to `'syncing'` in `integrations` array
    - Catch: remove from `syncingProviders`, show error
- [ ] Update `frontend/src/components/integrations/IntegrationCard.tsx`:
  - Add `<SyncStatusIndicator>` when `integration` is non-null
  - "Sync Now" button: `disabled={syncingProviders.has(provider)}`, shows spinner when disabled
  - Pass `onSyncNow` handler (no longer no-op)
- [ ] Update `frontend/src/pages/settings/IntegrationsPage.tsx`:
  - Add `useEffect` polling: `setInterval(() => store.fetchIntegrations(), 10_000)` while `store.syncingProviders.size > 0`; clear interval on unmount or when `syncingProviders` becomes empty
  - When `fetchIntegrations` shows none are `syncing` anymore, remove provider from `syncingProviders`

#### Tests

- [ ] Add to `backend/src/tests/integration-service.test.ts`:
  - Test `syncIntegration` sets `syncStatus='syncing'` in DB immediately then resolves to `{ jobId, status: 'queued' }`
  - Test `syncSlack` with mocked `axios.get` → returns `{ syncedItemCount: N }`
  - Test `syncJira` with mocked `axios.get` chain → returns `{ syncedItemCount: N }`
  - Test `refreshTokenIfNeeded` with expired token → calls `axios.post` for refresh, updates DB; with non-expired token → returns integration unchanged
- [ ] Add to `backend/src/tests/integration.test.ts`:
  - `GET /api/integrations/slack/status` with JWT + mocked integration in DB → 200 + `{ status, lastSyncedAt, syncedItemCount }`
  - `GET /api/integrations/slack/status` when integration not found → 404
  - `POST /api/integrations/slack/sync` with JWT → 200 + `{ success: true, data: { jobId: string, status: 'queued' } }`
- [ ] Add to `frontend/src/__tests__/SyncStatusIndicator.test.tsx`:
  - `syncStatus='idle'` → renders "Idle" badge, no timestamp shown if `lastSyncedAt=null`
  - `syncStatus='syncing'` → renders "Syncing" badge with spinner
  - `syncStatus='success'`, `lastSyncedAt='2026-05-13T09:00:00Z'` → renders "Success" badge + relative time string
  - `syncStatus='failed'` → renders "Failed" badge in red
- [ ] Add `frontend/e2e/integrations-sync.spec.ts`:
  - Setup: login + mock connected Slack integration (seed DB or mock API)
  - Navigate to `/settings/integrations`
  - Click "Sync Now" on Slack card → button becomes disabled + shows spinner
  - Badge changes to "Syncing"
  - Mock API poll response returning `syncStatus: 'success'` → badge updates to "Success" + "Sync Now" re-enables

#### Verification

- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm test`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm test`
- [ ] Commit: `git -C /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4 commit -m "feat(RB-49): sync progress indicator and background scheduler"`

---

### [x] Phase 4 — RB-50: Disconnect / Delete Functionality

**Goal**: "Disconnect" button on connected cards opens a confirmation dialog. Confirming calls `DELETE /api/integrations/:provider`, which best-effort revokes the OAuth token with the provider, then hard-deletes the Integration record (cascading to config + activities). Card updates to "Not Connected" optimistically on success.

#### Backend

- [ ] Add `disconnectIntegration(userId: string, provider: Provider): Promise<void>` to `backend/src/services/integration.service.ts`:
  - `prisma.integration.findUnique({ where: { userId_provider: { userId, provider } } })` → 404 if not found
  - Best-effort token revocation: `axios.post(config.revokeUrl, { token: decrypt(integration.accessToken) })` wrapped in `try/catch`; log revocation failure with `console.error` but do not throw
  - `prisma.integration.delete({ where: { id: integration.id } })` (cascades to `IntegrationConfig` + `IntegrationActivity`)
- [ ] Implement `deleteIntegration` controller handler in `backend/src/controllers/integration.controller.ts`:
  - Call `disconnectIntegration(req.userId, provider)`
  - Return `{ success: true, message: 'Integration disconnected' }`
  - Catch 404: return 404; other errors: 500

#### Frontend

- [ ] Create `frontend/src/components/integrations/DisconnectDialog.tsx`:
  - Uses `@radix-ui/react-dialog`
  - Props: `open: boolean`, `provider: Provider`, `onConfirm: () => void`, `onCancel: () => void`, `loading?: boolean`
  - Shows warning: "This will remove all stored tokens and sync history for <Provider>. This action cannot be undone."
  - "Disconnect" button (red/destructive style) calls `onConfirm`; "Cancel" calls `onCancel`; button shows spinner when `loading=true`
- [ ] Add `disconnect(provider: Provider): Promise<void>` to `frontend/src/services/integration.service.ts`:
  - `api.delete('/integrations/${provider}')` — returns void on 200, throws on error
- [ ] Update `frontend/src/stores/useIntegrationsStore.ts`:
  - Add `disconnectingProvider: Provider | null` state
  - Add `disconnect(provider: Provider): Promise<void>` action:
    - Set `disconnectingProvider = provider`
    - Optimistically remove integration from `integrations` array (set to null/filter)
    - Call `integrationService.disconnect(provider)`
    - On success: clear `disconnectingProvider`
    - On failure: rollback `integrations` to previous state, set `errorMessage`, clear `disconnectingProvider`
- [ ] Update `frontend/src/components/integrations/IntegrationCard.tsx`:
  - "Disconnect" button onClick calls `onDisconnect(provider)` (no longer no-op)
  - Shows spinner if `disconnectingProvider === provider`
- [ ] Update `frontend/src/pages/settings/IntegrationsPage.tsx`:
  - Add `DisconnectDialog` state: `disconnectingProvider: Provider | null`
  - Pass real `onDisconnect` handler: sets `disconnectingProvider`
  - Render `<DisconnectDialog>` controlled by `disconnectingProvider`
  - On confirm: call `store.disconnect(provider)`, close dialog, show success toast on completion
  - On failure: show error toast ("Failed to disconnect <Provider>. Please try again.")

#### Tests

- [ ] Add to `backend/src/tests/integration-service.test.ts`:
  - Test `disconnectIntegration` with valid integration: calls `axios.post` for revoke, then `prisma.integration.delete`
  - Test `disconnectIntegration` when revoke fails (axios throws): logs error, still calls `prisma.integration.delete` (best-effort)
  - Test `disconnectIntegration` when integration not found: throws 404-style error
- [ ] Add to `backend/src/tests/integration.test.ts`:
  - `DELETE /api/integrations/slack` without token → 401
  - `DELETE /api/integrations/slack` with JWT + mocked integration → 200 + `{ success: true, message: 'Integration disconnected' }`
  - Subsequent `GET /api/integrations` → data does not contain slack (or returns disconnected status)
  - `DELETE /api/integrations/invalid` → 400
- [ ] Create `frontend/src/__tests__/DisconnectDialog.test.tsx`:
  - Renders with `open=true, provider='slack'` → dialog visible with warning copy
  - Click "Cancel" → `onCancel` called; dialog unmounts
  - Click "Disconnect" → `onConfirm` called
  - `loading=true` → "Disconnect" button disabled + spinner
- [ ] Add to `frontend/e2e/integrations-disconnect.spec.ts` (Playwright):
  - Login + seed connected Slack integration
  - Navigate to `/settings/integrations`
  - Click "Disconnect" on Slack card → `DisconnectDialog` appears with warning text
  - Click "Cancel" → dialog closes, card still shows "Connected"
  - Click "Disconnect" again → confirm → Slack card returns to "Not Connected" state
  - Verify toast "Disconnected Slack" appears

#### Verification

- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm test`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm test`
- [ ] Commit: `git -C /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4 commit -m "feat(RB-50): disconnect and delete integration functionality"`

---

### [x] Phase 5 — RB-51: Configuration UI (Fine-Grained Sync Control) + Activity Log

**Goal**: "Configure" opens a drawer listing provider resources (channels/projects/spaces) with checkboxes. Saving calls `PUT /api/integrations/:provider/config`. Activity log section below cards shows paginated sync events, auto-refreshes after sync, expands failed entries.

#### Backend

- [ ] Add `getResources(userId: string, provider: Provider, page: number, limit: number)` to `backend/src/services/integration.service.ts`:
  - Find integration, call `refreshTokenIfNeeded` if needed
  - Fetch resources live from provider:
    - Slack: `axios.get('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=${limit}')` → map to `ResourceDTO[]` (`id: channel.id, name: channel.name, type: 'channel'`)
    - Jira: fetch accessible-resources → get cloudId → `axios.get('/rest/api/3/project')` → map (`id: project.id, name: project.name, type: 'project'`)
    - Confluence: fetch accessible-resources → `axios.get('/wiki/rest/api/space')` → map (`id: space.key, name: space.name, type: 'space'`)
  - Return `{ data: ResourceDTO[], pagination: { page, limit, total } }`
  - If access token 401: throw error with code `'REAUTH_REQUIRED'` (controller returns 401 with that code)
- [ ] Add `getConfig(userId: string, provider: Provider)` to `backend/src/services/integration.service.ts`:
  - Find integration, then `prisma.integrationConfig.findUnique({ where: { integrationId: integration.id } })`
  - Return `{ selectedResourceIds: config?.selectedResourceIds ?? [] }`
- [ ] Add `updateConfig(userId: string, provider: Provider, selectedResourceIds: string[])` to `backend/src/services/integration.service.ts`:
  - Find integration
  - `prisma.integrationConfig.upsert({ where: { integrationId }, create: { integrationId, selectedResourceIds }, update: { selectedResourceIds } })`
  - Log `config_updated` activity
  - Return `{ selectedResourceIds }`
- [ ] Add `getActivity(userId: string, page: number, limit: number)` to `backend/src/services/integration.service.ts`:
  - `prisma.integrationActivity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit })`
  - `prisma.integrationActivity.count({ where: { userId } })`
  - Return `{ data: ActivityDTO[], pagination: { page, limit, total } }`
- [ ] Implement remaining controller handlers in `backend/src/controllers/integration.controller.ts`:
  - `getResources`: calls `getResources(req.userId, provider, page, limit)`; on `REAUTH_REQUIRED` error returns 401 `{ success: false, code: 'REAUTH_REQUIRED' }`
  - `getConfig`: calls `getConfig(req.userId, provider)`
  - `updateConfig`: validates `req.body.selectedResourceIds` is `string[]` (via validator or inline check); calls `updateConfig(...)`
  - `listActivity`: calls `getActivity(req.userId, page, limit)`, returns paginated response
- [ ] Add validator for `updateConfig` body in `backend/src/validators/integration.validator.ts`:
  - Export `validateConfigBody` middleware: check `req.body.selectedResourceIds` is an Array; return 400 if not
- [ ] Update `PUT /:provider/config` route in `backend/src/routes/integration.routes.ts` to use `validateConfigBody` middleware

#### Frontend

- [ ] Create `frontend/src/components/integrations/ResourceList.tsx`:
  - Props: `resources: ResourceDTO[]`, `selectedIds: string[]`, `onChange: (ids: string[]) => void`, `loading?: boolean`
  - Renders list of checkboxes; toggling adds/removes `resource.id` from `selectedIds`
  - Shows loading skeleton (3–5 gray placeholder rows) when `loading=true`
- [ ] Create `frontend/src/components/integrations/ConfigureDrawer.tsx`:
  - Uses `@radix-ui/react-dialog` styled as a side drawer (fixed right panel)
  - Props: `open: boolean`, `provider: Provider`, `onClose: () => void`, `onSave: (ids: string[]) => Promise<void>`
  - On open: fetch resources via `integrationService.getResources(provider)` and current config via `integrationService.getConfig(provider)`; show loading state
  - If response has `code: 'REAUTH_REQUIRED'`: show "Your access token has expired. Please reconnect." + "Re-connect" button that opens `ConnectModal`
  - Renders `<ResourceList>` with fetched resources + current selection
  - "Save" button: calls `onSave(selectedIds)`, shows spinner, closes on success, shows error toast on failure
- [ ] Add service methods to `frontend/src/services/integration.service.ts`:
  - `getResources(provider: Provider, page?: number): Promise<{ data: ResourceDTO[], pagination: any }>`
  - `getConfig(provider: Provider): Promise<{ selectedResourceIds: string[] }>`
  - `updateConfig(provider: Provider, selectedResourceIds: string[]): Promise<{ selectedResourceIds: string[] }>`
  - `getActivity(page?: number): Promise<{ data: ActivityDTO[], pagination: any }>`
- [ ] Create `frontend/src/components/integrations/ActivityLogEntry.tsx`:
  - Props: `activity: ActivityDTO`
  - Renders: provider icon (inline SVG or emoji placeholder), event type label, `formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })`, `activity.message`
  - If `activity.eventType === 'sync_failed'` and `activity.detail`: renders `<details><summary>Show error</summary><pre>{activity.detail}</pre></details>` expandable section
- [ ] Create `frontend/src/components/integrations/ActivityLog.tsx`:
  - Props: `activities: ActivityDTO[]`, `page: number`, `total: number`, `limit: number`, `onPageChange: (page: number) => void`, `loading?: boolean`
  - Renders list of `<ActivityLogEntry>` components
  - Pagination: "Previous" / "Next" buttons, disabled appropriately
  - Shows "No activity yet" when empty and not loading
- [ ] Update `frontend/src/stores/useIntegrationsStore.ts`:
  - Add `activities: ActivityDTO[]`, `activityPage: number`, `activityTotal: number`, `activityLoading: boolean` state
  - Add `fetchActivity(page?: number): Promise<void>` action
  - Add `updateConfig(provider: Provider, selectedResourceIds: string[]): Promise<void>` action — calls service, logs activity (triggers `fetchActivity()`)
  - After any `triggerSync` completing (detected via poll showing `syncStatus` changed from `syncing`): call `fetchActivity()`
- [ ] Update `frontend/src/components/integrations/IntegrationCard.tsx`:
  - "Configure" button onClick calls `onConfigure(provider)` (no longer no-op)
- [ ] Update `frontend/src/pages/settings/IntegrationsPage.tsx`:
  - Add `configuringProvider: Provider | null` state
  - Pass real `onConfigure` handler: sets `configuringProvider`
  - Render `<ConfigureDrawer>` controlled by `configuringProvider`
  - On save: call `store.updateConfig(provider, selectedIds)`, show success toast
  - Add `<ActivityLog>` section below the integration cards grid
  - On mount: also call `store.fetchActivity()`
  - Pass `onPageChange` handler to `ActivityLog`

#### Tests

- [ ] Add to `backend/src/tests/integration-service.test.ts`:
  - Test `getResources('user1', 'slack', 1, 50)` with mocked `axios.get` → returns `ResourceDTO[]` with `type: 'channel'`
  - Test `getResources` when provider returns 401 → throws error with `code: 'REAUTH_REQUIRED'`
  - Test `updateConfig` → `prisma.integrationConfig.upsert` called + `prisma.integrationActivity.create` called with `eventType: 'config_updated'`
  - Test `getActivity` → paginated result with correct `skip`/`take`
- [ ] Add to `backend/src/tests/integration.test.ts`:
  - `GET /api/integrations/slack/resources` with JWT + mocked provider → 200 + `{ success: true, data: ResourceDTO[], pagination: ... }`
  - `PUT /api/integrations/slack/config` with `{ selectedResourceIds: ['C001', 'C002'] }` → 200 + updated config
  - `PUT /api/integrations/slack/config` with invalid body (not array) → 400
  - `GET /api/integrations/activity?page=1&limit=20` → 200 + paginated response
- [ ] Create `frontend/src/__tests__/ConfigureDrawer.test.tsx`:
  - Mock `integrationService.getResources` + `getConfig` to return test data
  - Renders with `open=true, provider='slack'` → shows resource list after loading
  - Toggle a checkbox → item added to selection
  - Click "Save" with selection → `onSave` called with correct IDs
  - Shows re-auth prompt when `getResources` returns 401
- [ ] Create `frontend/src/__tests__/ActivityLog.test.tsx`:
  - Renders list of activities → each `ActivityLogEntry` appears
  - Renders "No activity yet" when `activities=[]`
  - Clicking "Next" calls `onPageChange(2)`
- [ ] Create `frontend/src/__tests__/ActivityLogEntry.test.tsx`:
  - `eventType='sync_success'` → no expandable section
  - `eventType='sync_failed'` with `detail='Error details'` → `<details>` element present, expands on click
  - Renders relative timestamp string
- [ ] Add to `frontend/e2e/integrations-configure.spec.ts` (Playwright):
  - Login + seed connected Slack integration with resources available (mock API)
  - Navigate to `/settings/integrations`
  - Click "Configure" on Slack card → drawer opens with resource list
  - Toggle "#general" channel → check state changes
  - Click "Save" → drawer closes, success toast appears
  - Navigate back → activity log shows "config_updated" entry for Slack

#### Verification

- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/backend && npm test`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm run build`
- [ ] Run: `cd /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4/frontend && npm test`
- [ ] Commit: `git -C /Users/sushmitghosh/.zenflow/worktrees/ui-integration-settings-3aa4 commit -m "feat(RB-51): configuration UI and activity log"`
