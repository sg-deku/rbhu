# Technical Specification: UI Integration Settings

**Project**: rbhu  
**Branch**: ui-integration-settings-3aa4  
**Tickets**: RB-47, RB-48, RB-49, RB-50, RB-51  
**Date**: 2026-05-13

---

## 1. Technical Context

### Runtime & Language
- **Backend**: Node.js (ES2020), TypeScript 5, CommonJS modules
- **Frontend**: React 18, TypeScript 5, Vite 5 bundler
- **Database**: PostgreSQL via Prisma ORM (`@prisma/client`)
- **Auth**: JWT Bearer tokens (`jsonwebtoken`); `authMiddleware` attaches `req.userId: string`

### Existing Dependencies (relevant)
| Package | Location | Purpose |
|---------|----------|---------|
| `express` | backend | HTTP server |
| `@prisma/client` + `prisma` | backend | ORM / DB access |
| `jsonwebtoken` | backend | JWT sign/verify |
| `bcryptjs` | backend | password hashing (pattern for crypto usage) |
| `jest` + `supertest` + `ts-jest` | backend | unit + integration tests |
| `zustand` | frontend | state management |
| `@radix-ui/react-dialog` | frontend | modal dialogs |
| `framer-motion` | frontend | animations/transitions |
| `tailwindcss` + `clsx` + `tailwind-merge` + `class-variance-authority` | frontend | styling |
| `@playwright/test` | frontend | E2E tests |

### New Dependencies to Install
| Package | Location | Purpose |
|---------|----------|---------|
| `node-cron` + `@types/node-cron` | backend | background sync scheduler |
| `axios` + `@types/axios` | backend | HTTP calls to provider APIs |
| `react-router-dom` + `@types/react-router-dom` | frontend | client-side routing |
| `@radix-ui/react-dropdown-menu` | frontend | dropdown menus in cards |
| `date-fns` | frontend | relative timestamp formatting ("2 minutes ago") |
| `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + `vitest` | frontend | frontend unit tests |
| `jsdom` | frontend | vitest DOM environment |

### Constraints
- Token encryption: Node.js built-in `crypto` module (AES-256-GCM); no third-party crypto library
- Plaintext tokens must never appear in API responses or logs
- All integration endpoints require `authMiddleware`
- OAuth state parameter (CSRF token) required for all provider OAuth flows
- One commit per JIRA ticket; each commit includes implementation + unit + integration + E2E tests

---

## 2. Architecture Overview

### Observation: Dual ORM Pattern
The existing auth controller uses Mongoose-style method calls (`User.findOne`, `User.findById`) but the actual ORM configured is **Prisma** (`backend/prisma/schema.prisma`). The `src/models/user.model.ts` is a plain TypeScript interface, not a real ORM model. All **integration feature code will use Prisma** (`import prisma from '../config/database'`) exclusively.

### Backend Pattern to Follow
```
src/
  routes/auth.routes.ts      → route definitions, swagger JSDoc, middleware chain
  controllers/auth.controller.ts → async try/catch, call services/prisma, return { success, data }
  middleware/auth.middleware.ts   → JWT verification, attaches req.userId
  validators/auth.validator.ts   → express middleware for input validation
  services/                      → external service wrappers (S3, Elasticsearch)
```

Response shape convention (all endpoints):
```ts
{ success: boolean; data?: any; message?: string; pagination?: { page: number; limit: number; total: number } }
```

### Frontend Pattern to Follow
```
src/
  context/AuthContext.tsx    → React context for auth state
  services/api.ts            → fetch wrapper (get/post/put/delete)
  services/auth.service.ts   → auth-specific API calls
  pages/Login.tsx            → page components
  styles/variables.css       → CSS custom properties
```

---

## 3. Data Model Changes

### Prisma Schema Additions

Add to `backend/prisma/schema.prisma`:

```prisma
enum IntegrationProvider {
  jira
  slack
  confluence
}

enum IntegrationStatus {
  connected
  error
  disconnected
}

enum SyncStatus {
  idle
  syncing
  success
  failed
}

enum IntegrationEventType {
  sync_success
  sync_failed
  connected
  disconnected
  config_updated
}

model Integration {
  id              String              @id @default(cuid())
  userId          String
  provider        IntegrationProvider
  status          IntegrationStatus   @default(disconnected)
  accessToken     String
  refreshToken    String?
  tokenExpiresAt  DateTime?
  accountId       String?
  accountName     String?
  accountEmail    String?
  syncStatus      SyncStatus          @default(idle)
  lastSyncedAt    DateTime?
  syncedItemCount Int?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  config          IntegrationConfig?
  activities      IntegrationActivity[]

  @@unique([userId, provider])
  @@index([userId])
}

model IntegrationConfig {
  id                   String      @id @default(cuid())
  integrationId        String      @unique
  selectedResourceIds  String[]
  updatedAt            DateTime    @updatedAt

  integration          Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
}

model IntegrationActivity {
  id              String               @id @default(cuid())
  integrationId   String
  userId          String
  provider        IntegrationProvider
  eventType       IntegrationEventType
  message         String
  detail          String?
  syncedItemCount Int?
  createdAt       DateTime             @default(now())

  integration     Integration          @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([integrationId])
}
```

The `User` model also needs relation fields added:
```prisma
model User {
  // ... existing fields ...
  integrations  Integration[]
  activities    IntegrationActivity[]
}
```

---

## 4. Encryption Utility

**File**: `backend/src/utils/encryption.ts`

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY!, 'hex') // 32-byte hex string

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
```

---

## 5. OAuth Utility

**File**: `backend/src/utils/oauth-state.ts`

Handles CSRF state parameter (random nonce stored server-side, validated on callback). Since the app uses stateless JWT, state is encoded as a JWT signed with `JWT_SECRET` and contains `{ userId, provider, nonce }`.

```ts
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

export function generateOAuthState(userId: string, provider: string): string {
  const nonce = randomBytes(16).toString('hex')
  return jwt.sign({ userId, provider, nonce }, process.env.JWT_SECRET!, { expiresIn: '10m' })
}

export function verifyOAuthState(state: string): { userId: string; provider: string } {
  const decoded = jwt.verify(state, process.env.JWT_SECRET!) as any
  return { userId: decoded.userId, provider: decoded.provider }
}
```

---

## 6. Provider OAuth Configuration

**File**: `backend/src/config/integrations.ts`

```ts
interface ProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  revokeUrl?: string
}

export function getProviderConfig(provider: 'jira' | 'slack' | 'confluence'): ProviderConfig {
  switch (provider) {
    case 'slack':
      return {
        clientId: process.env.SLACK_CLIENT_ID!,
        clientSecret: process.env.SLACK_CLIENT_SECRET!,
        redirectUri: process.env.SLACK_REDIRECT_URI!,
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: ['channels:read', 'groups:read', 'users:read'],
        revokeUrl: 'https://slack.com/api/auth.revoke',
      }
    case 'jira':
      return {
        clientId: process.env.JIRA_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID!,
        clientSecret: process.env.JIRA_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET!,
        redirectUri: process.env.JIRA_REDIRECT_URI || process.env.ATLASSIAN_REDIRECT_URI!,
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        scopes: ['read:jira-work', 'read:jira-user', 'offline_access'],
        revokeUrl: 'https://auth.atlassian.com/oauth/token/revoke',
      }
    case 'confluence':
      return {
        clientId: process.env.CONFLUENCE_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID!,
        clientSecret: process.env.CONFLUENCE_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET!,
        redirectUri: process.env.CONFLUENCE_REDIRECT_URI || process.env.ATLASSIAN_REDIRECT_URI!,
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        scopes: ['read:confluence-space.summary', 'read:confluence-content.all', 'offline_access'],
        revokeUrl: 'https://auth.atlassian.com/oauth/token/revoke',
      }
  }
}
```

---

## 7. Backend Source Code Structure

### New Files to Create
```
backend/src/
  utils/
    encryption.ts               # AES-256-GCM encrypt/decrypt
    oauth-state.ts              # OAuth CSRF state JWT generation/verification
  config/
    integrations.ts             # Provider OAuth configs (clientId, scopes, URLs)
  routes/
    integration.routes.ts       # All /api/integrations/* route definitions
  controllers/
    integration.controller.ts   # HTTP handlers for all integration endpoints
  services/
    integration.service.ts      # Business logic: OAuth exchange, token storage, sync
    integration-sync.service.ts # Provider-specific resource fetching and sync logic
    integration-scheduler.ts    # node-cron background scheduler
  validators/
    integration.validator.ts    # Input validation middleware for integration routes
  tests/
    integration.test.ts         # Jest + Supertest integration tests
    integration-service.test.ts # Unit tests for service functions
```

### Existing Files to Modify
```
backend/src/
  server.ts                     # Register integrationRoutes; import scheduler startup
  prisma/schema.prisma          # Add new models (Integration, IntegrationConfig, IntegrationActivity)
.env.example                    # Add integration OAuth env vars
```

---

## 8. API Contract

### TypeScript Request/Response Types

```ts
type Provider = 'jira' | 'slack' | 'confluence'

interface IntegrationDTO {
  id: string
  provider: Provider
  status: 'connected' | 'error' | 'disconnected'
  accountName: string | null
  accountEmail: string | null
  syncStatus: 'idle' | 'syncing' | 'success' | 'failed'
  lastSyncedAt: string | null   // ISO 8601
  syncedItemCount: number | null
  createdAt: string
  updatedAt: string
}

interface ActivityDTO {
  id: string
  provider: Provider
  eventType: 'sync_success' | 'sync_failed' | 'connected' | 'disconnected' | 'config_updated'
  message: string
  detail: string | null
  syncedItemCount: number | null
  createdAt: string
}

interface ResourceDTO {
  id: string
  name: string
  type: string        // 'channel' | 'project' | 'space'
  metadata?: Record<string, unknown>
}
```

### Endpoint Specifications

#### `GET /api/integrations`
- Auth: Required
- Response: `{ success: true, data: IntegrationDTO[] }`

#### `GET /api/integrations/:provider/status`
- Auth: Required
- Params: `provider` ∈ `['jira', 'slack', 'confluence']`
- Response: `{ success: true, data: { status: SyncStatus, lastSyncedAt: string | null, syncedItemCount: number | null } }`
- 404 if integration not found

#### `POST /api/integrations/:provider/connect`
- Auth: Required
- Response: `{ success: true, data: { authorizationUrl: string } }`
- Generates OAuth state JWT, builds provider authorization URL with state + scopes

#### `GET /api/integrations/:provider/callback`
- Auth: Public (state JWT identifies user)
- Query params: `code: string`, `state: string` (success) OR `error: string`, `state: string` (failure)
- On success: exchange code for tokens, encrypt + persist, redirect to `CLIENT_URL/settings/integrations?connected=<provider>`
- On error: redirect to `CLIENT_URL/settings/integrations?error=<provider>&reason=<message>`

#### `POST /api/integrations/:provider/sync`
- Auth: Required
- Response: `{ success: true, data: { jobId: string, status: 'queued' } }`
- Enqueues sync (runs async, does not block response); updates syncStatus to 'syncing'

#### `DELETE /api/integrations/:provider`
- Auth: Required
- Best-effort token revocation with provider, then hard-delete Integration record (cascades to config + activities)
- Response: `{ success: true, message: 'Integration disconnected' }`

#### `GET /api/integrations/:provider/resources`
- Auth: Required
- Query: `page?: number` (default 1), `limit?: number` (default 50)
- Response: `{ success: true, data: ResourceDTO[], pagination: { page, limit, total } }`
- Fetches live from provider using stored (decrypted) access token; handles token refresh if expired

#### `GET /api/integrations/:provider/config`
- Auth: Required
- Response: `{ success: true, data: { selectedResourceIds: string[] } }`

#### `PUT /api/integrations/:provider/config`
- Auth: Required
- Body: `{ selectedResourceIds: string[] }`
- Response: `{ success: true, data: { selectedResourceIds: string[] } }`

#### `GET /api/integrations/activity`
- Auth: Required
- Query: `page?: number` (default 1), `limit?: number` (default 20)
- Response: `{ success: true, data: ActivityDTO[], pagination: { page, limit, total } }`

---

## 9. Integration Service Architecture

### `integration.service.ts` — Responsibilities
- `getIntegrations(userId)` → query Prisma, strip tokens, return DTOs
- `initiateOAuth(userId, provider)` → generate state, build authorizationUrl
- `handleCallback(code, state)` → verify state JWT, exchange code via `axios.post(tokenUrl)`, encrypt tokens, upsert Integration record, log `connected` activity
- `syncIntegration(userId, provider)` → set syncStatus='syncing', call `integration-sync.service.ts`, update syncStatus+lastSyncedAt, log activity
- `disconnectIntegration(userId, provider)` → attempt token revocation (best-effort), delete Integration record
- `getResources(userId, provider, page, limit)` → decrypt token, fetch from provider API, return ResourceDTO[]
- `getConfig(userId, provider)` → return IntegrationConfig.selectedResourceIds
- `updateConfig(userId, provider, selectedResourceIds)` → upsert IntegrationConfig, log `config_updated` activity
- `getActivity(userId, page, limit)` → paginated IntegrationActivity query

### `integration-sync.service.ts` — Responsibilities
- `syncSlack(integration)` → fetch channels using Slack Web API, store count
- `syncJira(integration)` → fetch projects using Atlassian REST API
- `syncConfluence(integration)` → fetch spaces using Confluence REST API
- `refreshTokenIfNeeded(integration)` → if `tokenExpiresAt` is within 5 minutes, exchange refreshToken for new accessToken, update record

### `integration-scheduler.ts` — Background Scheduler

Uses `node-cron` to run every 30 minutes. Queries all integrations with `status='connected'`, calls `syncIntegration` for each:

```ts
import cron from 'node-cron'
import { syncAllIntegrations } from './integration.service'

export function startIntegrationScheduler(): void {
  cron.schedule('*/30 * * * *', async () => {
    await syncAllIntegrations()
  })
}
```

Started in `server.ts` inside `startServer()` after `connectDB()`.

---

## 10. Frontend Source Code Structure

### New Files to Create
```
frontend/src/
  pages/
    settings/
      IntegrationsPage.tsx          # Main /settings/integrations page
  components/
    integrations/
      IntegrationCard.tsx           # Provider card (status badge, buttons)
      StatusBadge.tsx               # Connected/Error/Disconnected badge
      SyncStatusIndicator.tsx       # Idle/Syncing/Success/Failed badge + last synced
      ConnectModal.tsx              # Confirmation modal before OAuth redirect
      DisconnectDialog.tsx          # Confirmation dialog for disconnect
      ConfigureDrawer.tsx           # Drawer for resource selection
      ResourceList.tsx              # Checkbox list of provider resources
      ActivityLog.tsx               # Paginated activity log section
      ActivityLogEntry.tsx          # Single log entry with expandable error
    ui/
      Toast.tsx                     # Toast notification component (shared)
  stores/
    useIntegrationsStore.ts         # Zustand store for integration state
  services/
    integration.service.ts          # API calls to /api/integrations/*
  types/
    integrations.ts                 # Shared TypeScript types (IntegrationDTO, etc.)
  e2e/
    integrations.spec.ts            # Playwright E2E tests
    integrations-connect.spec.ts
    integrations-sync.spec.ts
    integrations-disconnect.spec.ts
    integrations-configure.spec.ts
```

### Existing Files to Modify
```
frontend/src/
  App.tsx                           # Add BrowserRouter + Routes for /settings/integrations
  main.tsx                          # No change needed if Router goes in App.tsx
frontend/
  package.json                      # Add react-router-dom, date-fns, testing deps
  vite.config.ts                    # Add test config (vitest)
```

---

## 11. Frontend Component Specifications

### `useIntegrationsStore` (Zustand)

```ts
interface IntegrationsState {
  integrations: IntegrationDTO[]
  activities: ActivityDTO[]
  activityPage: number
  activityTotal: number
  loading: boolean
  syncingProviders: Set<Provider>
  
  fetchIntegrations: () => Promise<void>
  fetchActivity: (page?: number) => Promise<void>
  triggerSync: (provider: Provider) => Promise<void>
  disconnect: (provider: Provider) => Promise<void>
  updateConfig: (provider: Provider, selectedResourceIds: string[]) => Promise<void>
  setOptimisticStatus: (provider: Provider, status: IntegrationStatus) => void
}
```

Polling: `useEffect` in `IntegrationsPage` sets a `setInterval` every 10 seconds calling `fetchIntegrations()` while `syncingProviders.size > 0`. Clears on unmount.

### `IntegrationCard` Props

```ts
interface IntegrationCardProps {
  provider: Provider
  integration: IntegrationDTO | null   // null = not connected
  onConnect: (provider: Provider) => void
  onDisconnect: (provider: Provider) => void
  onSyncNow: (provider: Provider) => void
  onConfigure: (provider: Provider) => void
}
```

### `ConnectModal` Props

```ts
interface ConnectModalProps {
  open: boolean
  provider: Provider
  scopes: string[]
  onConfirm: () => void
  onCancel: () => void
}
```

Uses `@radix-ui/react-dialog`. On confirm: calls `integrationService.initiateConnect(provider)` which returns `authorizationUrl`; sets `window.location.href = authorizationUrl`.

### `ConfigureDrawer` Props

```ts
interface ConfigureDrawerProps {
  open: boolean
  provider: Provider
  onClose: () => void
  onSave: (selectedIds: string[]) => Promise<void>
}
```

Fetches resources on open via `GET /api/integrations/:provider/resources`. Shows loading skeleton while fetching. Displays re-auth prompt if 401 returned.

### `ActivityLog` Props

```ts
interface ActivityLogProps {
  activities: ActivityDTO[]
  page: number
  total: number
  onPageChange: (page: number) => void
}
```

### `ActivityLogEntry` Props

```ts
interface ActivityLogEntryProps {
  activity: ActivityDTO
}
```

Renders provider icon, event type label, relative timestamp (via `date-fns/formatDistanceToNow`), message. If `eventType === 'sync_failed'` and `detail` is non-null, renders an expandable `<details>` section.

### Routing in `App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/settings/integrations" element={
      <ProtectedRoute><IntegrationsPage /></ProtectedRoute>
    } />
  </Routes>
</BrowserRouter>
```

`ProtectedRoute` checks `useAuth()` context; redirects to `/login` if no token.

### URL Param Handling on `IntegrationsPage`

On mount, `IntegrationsPage` reads `useSearchParams()`:
- `?connected=<provider>` → show success toast, refetch integrations
- `?error=<provider>&reason=<message>` → show error toast

---

## 12. CSS / Styling Conventions

- Follow `variables.css` CSS custom properties (`--color-primary`, `--color-border`, `--color-card`, etc.)
- Tailwind utility classes with `cn(clsx(...), twMerge(...))` helper pattern
- Status badge colors:
  - Connected: `bg-green-100 text-green-700`
  - Error: `bg-red-100 text-red-700`
  - Disconnected: `bg-gray-100 text-gray-500`
  - Syncing: `bg-blue-100 text-blue-700`
  - Success: `bg-green-100 text-green-700`
  - Failed: `bg-red-100 text-red-700`
- Cards: `bg-white rounded-lg shadow border border-[--color-border] p-6`
- Integration card grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

---

## 13. Environment Variables

Add to `.env.example`:

```bash
# Shared Atlassian OAuth app (Jira + Confluence)
ATLASSIAN_CLIENT_ID=
ATLASSIAN_CLIENT_SECRET=
ATLASSIAN_REDIRECT_URI=

# Optional provider-specific Atlassian overrides
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
JIRA_REDIRECT_URI=
CONFLUENCE_CLIENT_ID=
CONFLUENCE_CLIENT_SECRET=
CONFLUENCE_REDIRECT_URI=

# Slack OAuth app
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

# Token encryption (32-byte hex string: openssl rand -hex 32)
INTEGRATION_TOKEN_ENCRYPTION_KEY=
```

---

## 14. Delivery Phases

Each phase = one JIRA ticket = one commit = implementation + tests.

### Phase 1 — RB-47: Integration Cards with Status Indicators

**Goal**: Render `/settings/integrations` with three cards (not connected state only).

**Backend changes**:
- Add Prisma schema (all three new models + enums)
- Run migration: `prisma migrate dev --name add-integrations`
- Create `GET /api/integrations` endpoint (returns empty array for new users)
- Add `integration.routes.ts`, `integration.controller.ts` (stub), register in `server.ts`

**Frontend changes**:
- Install `react-router-dom`, `date-fns`
- Update `App.tsx` with `BrowserRouter` + `Routes`; add `ProtectedRoute`
- Add `frontend/src/types/integrations.ts`
- Create `IntegrationsPage.tsx`, `IntegrationCard.tsx`, `StatusBadge.tsx`
- Create `useIntegrationsStore.ts` (fetchIntegrations only)
- Create `frontend/src/services/integration.service.ts` (getIntegrations only)

**Tests**:
- Backend unit: `integration.service.ts` `getIntegrations` returns empty array for new user
- Backend integration (supertest): `GET /api/integrations` returns 200 + `{ success: true, data: [] }`
- Frontend unit (vitest + @testing-library/react): `IntegrationCard` renders correct badge for each status prop
- E2E (Playwright): navigate to `/settings/integrations` as logged-in user, verify three cards present

---

### Phase 2 — RB-48: Connect Modals and OAuth Redirect Handling

**Goal**: Full OAuth connect flow for all three providers.

**Backend changes**:
- Create `encryption.ts`, `oauth-state.ts`, `integrations.ts` config
- Install `axios`, `node-cron`
- Implement `POST /api/integrations/:provider/connect` → returns `authorizationUrl`
- Implement `GET /api/integrations/:provider/callback` → exchange code, encrypt tokens, upsert Integration, redirect
- Implement `integration.service.ts`: `initiateOAuth`, `handleCallback`

**Frontend changes**:
- `ConnectModal.tsx` using `@radix-ui/react-dialog`
- Update `IntegrationCard.tsx` to show "Connect" button → open modal
- `Toast.tsx` shared component
- `IntegrationsPage.tsx`: handle `?connected` / `?error` query params
- `integration.service.ts`: `initiateConnect(provider)` → POST connect, return authorizationUrl

**Tests**:
- Backend unit: `encryption.ts` encrypt/decrypt roundtrip; `oauth-state.ts` generate/verify state
- Backend unit: `handleCallback` with mocked `axios` token exchange
- Backend integration (supertest): `POST /api/integrations/slack/connect` returns 200 + authorizationUrl; `GET /api/integrations/slack/callback?error=access_denied&state=...` redirects correctly
- Frontend unit: `ConnectModal` renders scope list for each provider; closes on cancel
- E2E: click Connect on Slack card → modal appears → confirm → browser navigates to Slack OAuth URL (mock with Playwright route intercept)

---

### Phase 3 — RB-49: Sync Progress Indicator

**Goal**: Show sync status, "Sync Now" button, polling.

**Backend changes**:
- `GET /api/integrations/:provider/status` endpoint
- `POST /api/integrations/:provider/sync` endpoint
- `integration-sync.service.ts`: `syncSlack`, `syncJira`, `syncConfluence`, `refreshTokenIfNeeded`
- `integration-scheduler.ts`: node-cron every 30 minutes
- Register scheduler in `server.ts`

**Frontend changes**:
- `SyncStatusIndicator.tsx` component
- Update `IntegrationCard.tsx`: add sync badge + "Sync Now" button (disabled + spinner when syncing)
- `useIntegrationsStore.ts`: add `triggerSync`, polling logic
- `IntegrationsPage.tsx`: start/stop polling interval based on `syncingProviders`

**Tests**:
- Backend unit: `syncSlack/syncJira/syncConfluence` with mocked `axios`; `refreshTokenIfNeeded` token refresh path
- Backend integration: `GET /api/integrations/slack/status` → 200 with status shape; `POST /api/integrations/slack/sync` → 200 with `{ jobId, status: 'queued' }`
- Frontend unit: `SyncStatusIndicator` displays correct badge per status value; "Sync Now" button disabled + spinner when `syncing`
- E2E: click "Sync Now" → badge changes to "Syncing" → button disabled with spinner visible

---

### Phase 4 — RB-50: Disconnect / Delete Functionality

**Goal**: Disconnect flow with confirmation and token deletion.

**Backend changes**:
- `DELETE /api/integrations/:provider` endpoint
- `disconnectIntegration(userId, provider)` in `integration.service.ts`:  best-effort revoke → delete Integration (cascade deletes config + activities)

**Frontend changes**:
- `DisconnectDialog.tsx` using `@radix-ui/react-dialog`
- Update `IntegrationCard.tsx`: add "Disconnect" button → open dialog
- `useIntegrationsStore.ts`: add `disconnect`; optimistic update on success
- Error toast if disconnect API call fails

**Tests**:
- Backend unit: `disconnectIntegration` calls revoke (best-effort), deletes record; handles revoke failure gracefully
- Backend integration: `DELETE /api/integrations/slack` → 200; subsequent `GET /api/integrations` shows slack as disconnected
- Frontend unit: `DisconnectDialog` renders warning copy; "Confirm" button calls `onConfirm`; "Cancel" closes without calling
- E2E: click Disconnect → confirm dialog → card returns to "Not Connected" state

---

### Phase 5 — RB-51: Configuration UI + Activity Log

**Goal**: Fine-grained sync control and activity log.

**Backend changes**:
- `GET /api/integrations/:provider/resources` endpoint (paginated, live from provider)
- `GET /api/integrations/:provider/config` endpoint
- `PUT /api/integrations/:provider/config` endpoint
- `GET /api/integrations/activity` endpoint
- Activity logging throughout all service operations

**Frontend changes**:
- `ConfigureDrawer.tsx` (resource list + checkboxes + save)
- `ResourceList.tsx`
- `ActivityLog.tsx` + `ActivityLogEntry.tsx`
- Install `@radix-ui/react-dropdown-menu` if needed for drawer trigger
- Update `IntegrationCard.tsx`: add "Configure" button
- `IntegrationsPage.tsx`: add `ActivityLog` below cards; auto-refresh after sync complete
- `useIntegrationsStore.ts`: add `fetchActivity`, `updateConfig`

**Tests**:
- Backend unit: `getResources` with mocked provider API; `updateConfig` persists correctly
- Backend integration: `GET /api/integrations/slack/resources` → 200 + ResourceDTO[]; `PUT /api/integrations/slack/config` → 200; `GET /api/integrations/activity` → paginated
- Frontend unit: `ConfigureDrawer` renders resource list; toggle checkbox changes selection; "Save" calls onSave; `ActivityLog` renders entries; `ActivityLogEntry` expands error detail on `sync_failed`
- E2E: open Configure drawer → toggle channel → Save → toast confirmation; activity log updates after sync

---

## 15. Verification Approach

### Backend
```bash
# From backend/
npm run build              # TypeScript compile check
npm test                   # Jest: unit + integration tests (jest.config.js: roots=['src/tests'])
```

### Frontend
```bash
# From frontend/
npm run build              # TypeScript compile + Vite build
npx vitest run             # Vitest: unit tests for components and services
npx playwright test        # Playwright E2E (requires dev server running)
```

### Database
```bash
# From backend/
npx prisma validate        # Validate schema syntax
npx prisma migrate dev --name add-integrations   # Apply schema changes in dev
npx prisma generate        # Regenerate Prisma client after schema changes
```

---

## 16. Security Checklist

| Control | Implementation |
|---------|---------------|
| Tokens encrypted at rest | AES-256-GCM via `encryption.ts`; stored as `iv:tag:ciphertext` hex string |
| Tokens never in API responses | `IntegrationDTO` never includes `accessToken` / `refreshToken` fields |
| Tokens never logged | `integration.service.ts` never logs raw token strings |
| CSRF protection | OAuth state = signed JWT with `userId + provider + nonce`, 10min expiry |
| Auth required | All integration routes wrapped with `authMiddleware` except callbacks (state-verified) |
| Provider rate limits | `axios` calls catch 429 responses and log without crashing |
| Token refresh | `refreshTokenIfNeeded` called before every provider API call |
| Cascade deletion | `Integration` delete cascades to `IntegrationConfig` + `IntegrationActivity` via Prisma `onDelete: Cascade` |
