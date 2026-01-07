/**
 * Watch event types and factory functions for fsx.do
 */

export type WatchEventType = 'create' | 'modify' | 'delete' | 'rename'

export interface WatchEvent {
  type: WatchEventType
  path: string
  timestamp: number
  oldPath?: string
}

/**
 * Factory function to create watch events
 *
 * For rename events:
 * - First path argument is the OLD path
 * - Second path argument is the NEW path
 * - event.path will be the new path
 * - event.oldPath will be the old path
 */
export function createWatchEvent(
  type: WatchEventType,
  path: string,
  newPath?: string
): WatchEvent {
  if (type === 'rename') {
    return {
      type,
      path: newPath!,
      oldPath: path,
      timestamp: Date.now(),
    }
  }
  return {
    type,
    path,
    timestamp: Date.now(),
  }
}

/**
 * Type guard for create events
 */
export function isCreateEvent(event: WatchEvent): event is WatchEvent & { type: 'create' } {
  return event.type === 'create'
}

/**
 * Type guard for modify events
 */
export function isModifyEvent(event: WatchEvent): event is WatchEvent & { type: 'modify' } {
  return event.type === 'modify'
}

/**
 * Type guard for delete events
 */
export function isDeleteEvent(event: WatchEvent): event is WatchEvent & { type: 'delete' } {
  return event.type === 'delete'
}

/**
 * Type guard for rename events
 */
export function isRenameEvent(event: WatchEvent): event is WatchEvent & { type: 'rename'; oldPath: string } {
  return event.type === 'rename'
}
