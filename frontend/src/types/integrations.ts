export type Provider = 'jira' | 'slack' | 'confluence'

export type IntegrationStatus = 'connected' | 'error' | 'disconnected'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed'

export type IntegrationEventType =
  | 'sync_success'
  | 'sync_failed'
  | 'connected'
  | 'disconnected'
  | 'config_updated'

export interface IntegrationDTO {
  id: string
  provider: Provider
  status: IntegrationStatus
  accountName: string | null
  accountEmail: string | null
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  syncedItemCount: number | null
  createdAt: string
  updatedAt: string
}

export interface ActivityDTO {
  id: string
  provider: Provider
  eventType: IntegrationEventType
  message: string
  detail: string | null
  syncedItemCount: number | null
  createdAt: string
}

export interface ResourceDTO {
  id: string
  name: string
  type: string
  metadata?: Record<string, unknown>
}
