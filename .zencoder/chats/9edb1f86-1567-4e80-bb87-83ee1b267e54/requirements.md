# Product Requirements Document: UI Integration Settings

**Project**: rbhu  
**Branch**: ui-integration-settings-3aa4  
**Date**: 2026-05-13  
**Tickets**: RB-47, RB-48, RB-49, RB-50, RB-51

---

## 1. Overview

This PRD defines requirements for an Integration Settings feature that allows authenticated users to connect, configure, monitor, and disconnect third-party integrations: **Jira**, **Slack**, and **Confluence**. Integration data is synced on a scheduled or on-demand basis. Users can see real-time sync status, configure which resources are synced (channels, projects, spaces), and review an activity log of sync results.

---

## 2. Stakeholder Goals

| Stakeholder | Goal |
|-------------|------|
| End User | Connect/disconnect third-party tools and see sync status at a glance |
| Admin | Audit integration events and manage all users' integrations |
| Product | Provide a seamless, guided OAuth flow with clear error states |

---

## 3. User Stories

### RB-47 — Integration Cards with Status Indicators

**As a user**, I want to see a settings page that shows cards for Jira, Slack, and Confluence so I can understand which integrations are available, which are connected, and their current health status.

**Acceptance Criteria:**

- AC-1: An "Integrations" page (route `/settings/integrations`) renders three cards: Jira, Slack, Confluence.
- AC-2: Each card shows the provider logo, name, a short description, and a connection status badge (Connected / Not Connected / Error).
- AC-3: Connected cards display the connected account identifier (e.g. workspace name or email).
- AC-4: Cards are responsive; they stack vertically on mobile and display in a 1–3 column grid on larger screens.
- AC-5: The page requires authentication; unauthenticated users are redirected to login.

---

### RB-48 — Connect Modals and OAuth Redirect Handling

**As a user**, I want to click "Connect" on an integration card and be guided through an OAuth flow so I can authorize rbhu to access my Jira/Slack/Confluence account.

**Acceptance Criteria:**

- AC-1: Clicking "Connect" opens a confirmation modal showing what permissions will be requested (scopes).
- AC-2: Confirming the modal redirects the user's browser to the provider's OAuth authorization URL.
- AC-3: OAuth callback routes exist on the backend for each provider (`/api/integrations/jira/callback`, `/api/integrations/slack/callback`, `/api/integrations/confluence/callback`).
- AC-4: On successful OAuth, the access token, refresh token, token expiry, and connected account metadata (workspace name, user email) are persisted in the database, associated with the authenticated user.
- AC-5: After successful OAuth, the browser is redirected back to `/settings/integrations?connected=<provider>` and the card updates to "Connected" without a full page reload.
- AC-6: If the user cancels or an error occurs, they are redirected to `/settings/integrations?error=<provider>&reason=<message>` and a toast/alert is displayed.
- AC-7: Tokens are stored encrypted at rest; plaintext tokens must never be logged or returned in API responses.

---

### RB-49 — Sync Progress Indicator

**As a user**, I want to see the last sync time and current sync status for each connected integration so I know whether my data is up to date.

**Acceptance Criteria:**

- AC-1: Each connected integration card displays a "Last synced" timestamp (relative: "2 minutes ago") and a status badge (Idle / Syncing / Success / Failed).
- AC-2: A "Sync Now" button is visible on connected cards and triggers an on-demand sync for that provider.
- AC-3: While a sync is in progress, the badge changes to "Syncing" and the button is disabled with a spinner.
- AC-4: Sync status is polled from the backend every 10 seconds while the page is open (or via server-sent events / WebSocket if already available).
- AC-5: The backend exposes a `GET /api/integrations/:provider/status` endpoint returning `{ status, lastSyncedAt, syncedItemCount }`.
- AC-6: The backend exposes a `POST /api/integrations/:provider/sync` endpoint that enqueues or runs a sync and returns `{ jobId, status }`. Additionally, a background scheduler automatically runs syncs at regular intervals (e.g., every 30 minutes) for all connected integrations.

---

### RB-50 — Disconnect / Delete Functionality

**As a user**, I want to disconnect or delete an integration so I can revoke rbhu's access to my account and remove all stored tokens.

**Acceptance Criteria:**

- AC-1: Connected cards show a "Disconnect" button/link.
- AC-2: Clicking "Disconnect" opens a confirmation dialog explaining that all stored tokens and sync history for the provider will be removed.
- AC-3: Confirming calls `DELETE /api/integrations/:provider` on the backend.
- AC-4: The backend revokes the OAuth token with the provider (best-effort, failure is logged but does not block the disconnect).
- AC-5: All stored tokens, refresh tokens, and sync history records for the integration are deleted from the database.
- AC-6: The card returns to "Not Connected" state immediately after a successful disconnect response.
- AC-7: If disconnect fails, an error toast is displayed and the integration remains connected.

---

### RB-51 — Configuration UI (Fine-Grained Sync Control) + Activity Log

**As a user**, I want to choose which Slack channels, Jira projects, or Confluence spaces are synced and review a log of recent sync events so I have control over what data enters rbhu.

**Acceptance Criteria — Configuration UI:**

- AC-1: A "Configure" button appears on connected integration cards.
- AC-2: Clicking "Configure" opens a drawer or dedicated settings panel listing the available resources for that provider (channels for Slack, projects for Jira, spaces for Confluence).
- AC-3: Resources are fetched live from the provider API via `GET /api/integrations/:provider/resources` (paginated).
- AC-4: The user can select/deselect resources using checkboxes or a multi-select component.
- AC-5: Saving the configuration calls `PUT /api/integrations/:provider/config` with the selected resource IDs.
- AC-6: Configuration is persisted per user per provider and applied to subsequent sync operations.
- AC-7: If the access token is expired/invalid, the configuration panel shows a re-authorization prompt.

**Acceptance Criteria — Activity Log:**

- AC-8: A shared "Activity Log" section on the Integrations page (below the cards) shows a paginated list of recent sync events across all providers.
- AC-9: Each log entry shows: provider icon, event type (sync_success, sync_failed, connected, disconnected), timestamp, and a short message (e.g. "Synced 42 items from #general").
- AC-10: The log is fetched from `GET /api/integrations/activity?page=1&limit=20`.
- AC-11: The log auto-refreshes when a sync completes (in-page, not full reload).
- AC-12: Failed sync entries display an expandable error detail section.

---

## 4. Data Model Requirements

### New Prisma Models

#### `Integration`
Stores one record per (user, provider) pair representing the OAuth connection.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | FK → User.id |
| provider | Enum (jira, slack, confluence) | Integration type |
| status | Enum (connected, error, disconnected) | Current connection status |
| accessToken | String (encrypted) | OAuth access token |
| refreshToken | String? (encrypted) | OAuth refresh token |
| tokenExpiresAt | DateTime? | Token expiry |
| accountId | String? | Provider account/workspace ID |
| accountName | String? | Human-readable account name |
| accountEmail | String? | Account email |
| syncStatus | Enum (idle, syncing, success, failed) | Last sync state |
| lastSyncedAt | DateTime? | Timestamp of last successful sync |
| syncedItemCount | Int? | Count of items synced in last run |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Record update |

#### `IntegrationConfig`
Stores per-provider sync configuration (which resources to sync).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| integrationId | String | FK → Integration.id |
| selectedResourceIds | String[] | Array of provider resource IDs |
| updatedAt | DateTime | Last updated |

#### `IntegrationActivity`
Stores sync event log entries.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| integrationId | String | FK → Integration.id |
| userId | String | FK → User.id (denormalized for query performance) |
| provider | Enum (jira, slack, confluence) | For cross-provider activity queries |
| eventType | Enum (sync_success, sync_failed, connected, disconnected, config_updated) | Event type |
| message | String | Human-readable message |
| detail | String? | Error detail / stack trace (expandable) |
| syncedItemCount | Int? | Items synced (for sync events) |
| createdAt | DateTime | Event timestamp |

---

## 5. API Requirements

### Backend Routes — `/api/integrations`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/integrations` | Required | List all integrations for the current user |
| GET | `/api/integrations/:provider/status` | Required | Get sync status for a provider |
| POST | `/api/integrations/:provider/connect` | Required | Initiate OAuth flow; returns authorization URL |
| GET | `/api/integrations/:provider/callback` | Public* | OAuth callback from provider |
| POST | `/api/integrations/:provider/sync` | Required | Trigger on-demand sync |
| DELETE | `/api/integrations/:provider` | Required | Disconnect integration and delete tokens |
| GET | `/api/integrations/:provider/resources` | Required | List available resources from provider |
| GET | `/api/integrations/:provider/config` | Required | Get current sync configuration |
| PUT | `/api/integrations/:provider/config` | Required | Update sync configuration |
| GET | `/api/integrations/activity` | Required | Get paginated activity log |

*Callback route uses the OAuth state parameter to identify the authenticated user.

### Provider: enum values
`jira` | `slack` | `confluence`

---

## 6. OAuth Providers

### Slack
- OAuth 2.0 with scopes: `channels:read`, `groups:read`, `users:read`
- App installation flow targeting a Slack workspace
- Resources: channels (public + private the user has access to)

### Jira (Atlassian)
- Atlassian OAuth 2.0 (3LO)
- Authorization URL: `https://auth.atlassian.com/authorize`
- Scopes: `read:jira-work`, `read:jira-user`
- Resources: Jira projects

### Confluence
- Same Atlassian OAuth 2.0 (3LO) as Jira (can reuse Atlassian app registration)
- Scopes: `read:confluence-space.summary`, `read:confluence-content.all`
- Resources: Confluence spaces

### Environment Variables Required (additions to `.env.example`)
```
# Shared Atlassian OAuth app (supports both Jira and Confluence)
ATLASSIAN_CLIENT_ID=
ATLASSIAN_CLIENT_SECRET=
ATLASSIAN_REDIRECT_URI=

# Optional: Provider-specific Atlassian overrides (leave blank to use shared ATLASSIAN_* above)
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

# Token encryption
INTEGRATION_TOKEN_ENCRYPTION_KEY=
```

---

## 7. Frontend Requirements

### Route
- `/settings/integrations` — main integrations page (protected)

### Component Hierarchy (proposed)
```
IntegrationsPage
├── IntegrationCard (×3: Jira, Slack, Confluence)
│   ├── StatusBadge
│   ├── SyncStatusIndicator (when connected)
│   ├── ConnectButton → ConnectModal
│   ├── SyncNowButton (when connected)
│   ├── ConfigureButton → ConfigureDrawer
│   └── DisconnectButton → ConfirmDialog
└── ActivityLog
    └── ActivityLogEntry (×n)
```

### State Management
- Zustand store: `useIntegrationsStore` to manage integration list, sync status, and activity log
- Optimistic updates for connect/disconnect/sync actions
- Polling interval cleanup on unmount

### UI Component Library
- `@radix-ui/react-dialog` (already installed) for Connect and Disconnect confirmation modals
- Tailwind CSS for styling, following existing CSS variable patterns
- Framer Motion (already installed) for card transitions and loading states
- ShadCN UI patterns with `clsx` + `tailwind-merge` + `class-variance-authority` (all already installed)

---

## 8. Testing Requirements

Per the project mandate: **one commit per JIRA ticket** containing implementation + unit tests + integration tests + E2E tests where applicable.

### RB-47
- **Unit**: test IntegrationCard renders correct status badge for each status
- **Integration**: test `GET /api/integrations` returns correct shape
- **E2E**: navigate to `/settings/integrations` and verify all three cards are visible

### RB-48
- **Unit**: test ConnectModal renders correct scopes per provider; test OAuth callback handler (token persistence logic)
- **Integration**: test `/api/integrations/:provider/connect` returns an authorization URL; test callback route creates Integration record
- **E2E**: click Connect on Slack card, verify modal appears, verify redirect to Slack OAuth URL (mock in test)

### RB-49
- **Unit**: test SyncStatusIndicator displays correct badge per status; test polling logic
- **Integration**: test `GET /api/integrations/:provider/status` endpoint; test `POST /api/integrations/:provider/sync` endpoint
- **E2E**: verify "Sync Now" button becomes disabled during sync and badge updates to "Syncing"

### RB-50
- **Unit**: test ConfirmDialog renders with correct copy; test disconnect service function
- **Integration**: test `DELETE /api/integrations/:provider` deletes DB records and calls provider revocation
- **E2E**: click Disconnect, confirm dialog, verify card returns to "Not Connected"

### RB-51
- **Unit**: test ConfigureDrawer renders resource list; test ActivityLog renders entries; test ActivityLogEntry expands error detail
- **Integration**: test `GET /api/integrations/:provider/resources`; test `PUT /api/integrations/:provider/config`; test `GET /api/integrations/activity`
- **E2E**: open Configure drawer, toggle a channel selection, save, verify toast confirmation; verify activity log updates after sync

---

## 9. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Security | OAuth tokens encrypted at rest using AES-256; tokens never returned in API responses |
| Security | OAuth state parameter (CSRF protection) used in all OAuth flows |
| Security | All integration endpoints require `authMiddleware` |
| Performance | Integration card list loads within 500 ms for up to 10 integrations |
| Performance | Activity log paginates at 20 items per page |
| Reliability | Token refresh handled automatically on 401 from provider APIs |
| UX | All async operations show loading states; all errors surface as user-visible toast messages |
| UX | Disconnect confirmation modal must require explicit user action (not one-click) |
| Accessibility | Modal dialogs trap focus and are keyboard-dismissible |
| Observability | All sync events logged to `IntegrationActivity` table; errors include detail field |

---

## 10. Out of Scope

- Real-time bidirectional sync (write-back to Jira/Slack/Confluence)
- Multi-account connections (one account per provider per user)
- Admin-level management of other users' integrations (future)
- Webhook-based sync triggers (future; current scope is polling/on-demand)
- GitHub, Notion, or other providers (future)

---

## 11. Open Questions / Assumptions

| # | Question | Assumption Made |
|---|----------|-----------------|
| 1 | Should integration config (selected channels/projects) be fetched live from the provider each time the drawer opens, or cached? | Fetched live each time to ensure freshness; cache TTL can be added later |
| 2 | Should sync run on a background schedule, or only on-demand? | **CONFIRMED**: Both on-demand ("Sync Now" button) AND scheduled background sync will be implemented in these tickets. Backend scheduler runs syncs at regular intervals (e.g., every 30 minutes) for all connected integrations. |
| 3 | Is there a specific token encryption library preference? | **CONFIRMED**: Use Node.js built-in `crypto` (AES-256-GCM) consistent with existing backend patterns |
| 4 | The frontend uses both Next.js (in `.navi.json`) and Vite. Which should be used? | Vite + React (as used by all existing frontend code); Next.js appears to be a mis-configuration in `.navi.json` |
| 5 | Is there a router installed (react-router-dom)? | **CONFIRMED**: react-router-dom WILL be added to the frontend for routing to the `/settings/integrations` route, consistent with the existing Login/Register page structure |
| 6 | Should the activity log be global (across providers) or per-provider? | Global activity log shown below all cards; provider icon differentiates entries |
| 7 | What is the token storage encryption strategy (per-user key vs. app-wide key)? | App-wide encryption key (`INTEGRATION_TOKEN_ENCRYPTION_KEY` env var) for simplicity; per-user key can be added later |
| 8 | Should Atlassian OAuth use a single shared app (one client_id/secret for both Jira and Confluence) or separate apps? | **CONFIRMED**: Support BOTH a single shared Atlassian app AND optionally separate apps. Implementation is flexible via environment variables: use `ATLASSIAN_CLIENT_ID`/`ATLASSIAN_CLIENT_SECRET` as the shared default; provider-specific `JIRA_CLIENT_ID` and `CONFLUENCE_CLIENT_ID` override if set. |
