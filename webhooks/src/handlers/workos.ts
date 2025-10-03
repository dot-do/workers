import type { Env, WorkOSEvent, WorkOSDirectorySync, WorkOSUser } from '../types'

/**
 * Handle WorkOS webhook events
 *
 * Supported events:
 * - dsync.activated
 * - dsync.deleted
 * - dsync.user.created
 * - dsync.user.updated
 * - dsync.user.deleted
 * - dsync.group.created
 * - dsync.group.updated
 * - dsync.group.deleted
 */
export async function handleWorkOSWebhook(event: WorkOSEvent, env: Env): Promise<any> {
  console.log(`[WORKOS] Processing event: ${event.event}`)

  switch (event.event) {
    case 'dsync.activated':
      return handleDirectorySyncActivated(event.data as WorkOSDirectorySync, env)

    case 'dsync.deleted':
      return handleDirectorySyncDeleted(event.data as WorkOSDirectorySync, env)

    case 'dsync.user.created':
      return handleUserCreated(event.data as WorkOSUser, env)

    case 'dsync.user.updated':
      return handleUserUpdated(event.data as WorkOSUser, env)

    case 'dsync.user.deleted':
      return handleUserDeleted(event.data as WorkOSUser, env)

    case 'dsync.group.created':
      return handleGroupCreated(event.data, env)

    case 'dsync.group.updated':
      return handleGroupUpdated(event.data, env)

    case 'dsync.group.deleted':
      return handleGroupDeleted(event.data, env)

    default:
      console.log(`[WORKOS] Unhandled event type: ${event.event}`)
      return { acknowledged: true, event_type: event.event }
  }
}

/**
 * Handle directory sync activated
 */
async function handleDirectorySyncActivated(directorySync: WorkOSDirectorySync, env: Env): Promise<any> {
  console.log(`[WORKOS] Directory sync activated: ${directorySync.id}`)

  // Store directory sync in database
  await env.DB.query({
    sql: `INSERT INTO directory_syncs (workos_directory_id, organization_id, name, state, type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
          ON CONFLICT (workos_directory_id) DO UPDATE SET state = ?, updated_at = NOW()`,
    params: [directorySync.id, directorySync.organization_id, directorySync.name, directorySync.state, directorySync.type, directorySync.state],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'directory_sync.activated',
    payload: {
      directorySyncId: directorySync.id,
      organizationId: directorySync.organization_id,
      name: directorySync.name,
    },
  })

  return { processed: true, directory_sync: directorySync.id }
}

/**
 * Handle directory sync deleted
 */
async function handleDirectorySyncDeleted(directorySync: WorkOSDirectorySync, env: Env): Promise<any> {
  console.log(`[WORKOS] Directory sync deleted: ${directorySync.id}`)

  // Update directory sync state
  await env.DB.query({
    sql: `UPDATE directory_syncs SET state = 'deleted', updated_at = NOW() WHERE workos_directory_id = ?`,
    params: [directorySync.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'directory_sync.deleted',
    payload: {
      directorySyncId: directorySync.id,
      organizationId: directorySync.organization_id,
    },
  })

  return { processed: true, directory_sync: directorySync.id }
}

/**
 * Handle user created via SCIM
 */
async function handleUserCreated(user: WorkOSUser, env: Env): Promise<any> {
  console.log(`[WORKOS] User created: ${user.id}`)

  // Create user in database
  await env.DB.query({
    sql: `INSERT INTO users (workos_user_id, email, first_name, last_name, username, state, custom_attributes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON CONFLICT (workos_user_id) DO UPDATE SET
            email = ?, first_name = ?, last_name = ?, username = ?, state = ?, custom_attributes = ?, updated_at = NOW()`,
    params: [
      user.id,
      user.email,
      user.first_name || null,
      user.last_name || null,
      user.username || null,
      user.state,
      JSON.stringify(user.custom_attributes || {}),
      user.email,
      user.first_name || null,
      user.last_name || null,
      user.username || null,
      user.state,
      JSON.stringify(user.custom_attributes || {}),
    ],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'user.created',
    payload: {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  })

  return { processed: true, user: user.id }
}

/**
 * Handle user updated via SCIM
 */
async function handleUserUpdated(user: WorkOSUser, env: Env): Promise<any> {
  console.log(`[WORKOS] User updated: ${user.id}`)

  // Update user in database
  await env.DB.query({
    sql: `UPDATE users SET
            email = ?, first_name = ?, last_name = ?, username = ?, state = ?, custom_attributes = ?, updated_at = NOW()
          WHERE workos_user_id = ?`,
    params: [user.email, user.first_name || null, user.last_name || null, user.username || null, user.state, JSON.stringify(user.custom_attributes || {}), user.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'user.updated',
    payload: {
      userId: user.id,
      email: user.email,
      state: user.state,
    },
  })

  return { processed: true, user: user.id }
}

/**
 * Handle user deleted via SCIM
 */
async function handleUserDeleted(user: WorkOSUser, env: Env): Promise<any> {
  console.log(`[WORKOS] User deleted: ${user.id}`)

  // Update user state
  await env.DB.query({
    sql: `UPDATE users SET state = 'inactive', updated_at = NOW() WHERE workos_user_id = ?`,
    params: [user.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'user.deleted',
    payload: {
      userId: user.id,
      email: user.email,
    },
  })

  return { processed: true, user: user.id }
}

/**
 * Handle group created via SCIM
 */
async function handleGroupCreated(group: any, env: Env): Promise<any> {
  console.log(`[WORKOS] Group created: ${group.id}`)

  // Create group in database
  await env.DB.query({
    sql: `INSERT INTO groups (workos_group_id, name, created_at, updated_at)
          VALUES (?, ?, NOW(), NOW())
          ON CONFLICT (workos_group_id) DO UPDATE SET name = ?, updated_at = NOW()`,
    params: [group.id, group.name, group.name],
  })

  return { processed: true, group: group.id }
}

/**
 * Handle group updated via SCIM
 */
async function handleGroupUpdated(group: any, env: Env): Promise<any> {
  console.log(`[WORKOS] Group updated: ${group.id}`)

  // Update group in database
  await env.DB.query({
    sql: `UPDATE groups SET name = ?, updated_at = NOW() WHERE workos_group_id = ?`,
    params: [group.name, group.id],
  })

  return { processed: true, group: group.id }
}

/**
 * Handle group deleted via SCIM
 */
async function handleGroupDeleted(group: any, env: Env): Promise<any> {
  console.log(`[WORKOS] Group deleted: ${group.id}`)

  // Delete group from database
  await env.DB.query({
    sql: `DELETE FROM groups WHERE workos_group_id = ?`,
    params: [group.id],
  })

  return { processed: true, group: group.id }
}
