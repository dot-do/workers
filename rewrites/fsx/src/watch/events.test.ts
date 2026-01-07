import { describe, it, expect } from 'vitest'
import {
  WatchEvent,
  createWatchEvent,
  isCreateEvent,
  isModifyEvent,
  isDeleteEvent,
  isRenameEvent,
} from './events'

describe('WatchEvent interface', () => {
  it('Event has required fields: type, path, timestamp', () => {
    const event = createWatchEvent('create', '/test/file.txt')

    expect(event).toHaveProperty('type')
    expect(event).toHaveProperty('path')
    expect(event).toHaveProperty('timestamp')
    expect(typeof event.type).toBe('string')
    expect(typeof event.path).toBe('string')
    expect(typeof event.timestamp).toBe('number')
  })

  it('type is one of: create | modify | delete | rename', () => {
    const createEvent = createWatchEvent('create', '/test')
    const modifyEvent = createWatchEvent('modify', '/test')
    const deleteEvent = createWatchEvent('delete', '/test')
    const renameEvent = createWatchEvent('rename', '/old', '/new')

    expect(['create', 'modify', 'delete', 'rename']).toContain(createEvent.type)
    expect(['create', 'modify', 'delete', 'rename']).toContain(modifyEvent.type)
    expect(['create', 'modify', 'delete', 'rename']).toContain(deleteEvent.type)
    expect(['create', 'modify', 'delete', 'rename']).toContain(renameEvent.type)
  })

  it('path is a string', () => {
    const event = createWatchEvent('create', '/test/path')
    expect(typeof event.path).toBe('string')
    expect(event.path).toBe('/test/path')
  })

  it('timestamp is a number (epoch ms)', () => {
    const before = Date.now()
    const event = createWatchEvent('create', '/test')
    const after = Date.now()

    expect(typeof event.timestamp).toBe('number')
    expect(event.timestamp).toBeGreaterThanOrEqual(before)
    expect(event.timestamp).toBeLessThanOrEqual(after)
  })
})

describe('Event creation factory', () => {
  it('createWatchEvent("create", "/path") creates a create event', () => {
    const event = createWatchEvent('create', '/test/file.txt')

    expect(event.type).toBe('create')
    expect(event.path).toBe('/test/file.txt')
    expect(event.timestamp).toBeGreaterThan(0)
    expect(event.oldPath).toBeUndefined()
  })

  it('createWatchEvent("modify", "/path") creates a modify event', () => {
    const event = createWatchEvent('modify', '/test/file.txt')

    expect(event.type).toBe('modify')
    expect(event.path).toBe('/test/file.txt')
    expect(event.timestamp).toBeGreaterThan(0)
    expect(event.oldPath).toBeUndefined()
  })

  it('createWatchEvent("delete", "/path") creates a delete event', () => {
    const event = createWatchEvent('delete', '/test/file.txt')

    expect(event.type).toBe('delete')
    expect(event.path).toBe('/test/file.txt')
    expect(event.timestamp).toBeGreaterThan(0)
    expect(event.oldPath).toBeUndefined()
  })

  it('createWatchEvent("rename", "/old", "/new") creates a rename event with oldPath', () => {
    const event = createWatchEvent('rename', '/old/path.txt', '/new/path.txt')

    expect(event.type).toBe('rename')
    expect(event.path).toBe('/new/path.txt')
    expect(event.oldPath).toBe('/old/path.txt')
    expect(event.timestamp).toBeGreaterThan(0)
  })
})

describe('Rename events', () => {
  it('Rename event includes oldPath field', () => {
    const event = createWatchEvent('rename', '/old/file.txt', '/new/file.txt')

    expect(event).toHaveProperty('oldPath')
    expect(event.oldPath).toBe('/old/file.txt')
  })

  it('Rename event path is the new path', () => {
    const event = createWatchEvent('rename', '/old/file.txt', '/new/file.txt')

    expect(event.path).toBe('/new/file.txt')
    expect(event.path).not.toBe('/old/file.txt')
  })
})

describe('Serialization', () => {
  it('Event serializes to JSON correctly', () => {
    const event = createWatchEvent('create', '/test/file.txt')
    const json = JSON.stringify(event)
    const parsed = JSON.parse(json)

    expect(parsed).toHaveProperty('type')
    expect(parsed).toHaveProperty('path')
    expect(parsed).toHaveProperty('timestamp')
    expect(parsed.type).toBe(event.type)
    expect(parsed.path).toBe(event.path)
    expect(parsed.timestamp).toBe(event.timestamp)
  })

  it('Event can be deserialized back', () => {
    const original = createWatchEvent('modify', '/test/file.txt')
    const json = JSON.stringify(original)
    const deserialized: WatchEvent = JSON.parse(json)

    expect(deserialized.type).toBe(original.type)
    expect(deserialized.path).toBe(original.path)
    expect(deserialized.timestamp).toBe(original.timestamp)
    expect(deserialized.oldPath).toBe(original.oldPath)
  })

  it('Rename event serializes with oldPath', () => {
    const event = createWatchEvent('rename', '/old.txt', '/new.txt')
    const json = JSON.stringify(event)
    const parsed = JSON.parse(json)

    expect(parsed.oldPath).toBe('/old.txt')
    expect(parsed.path).toBe('/new.txt')
  })
})

describe('Type guards', () => {
  it('isCreateEvent(event) returns true for create events', () => {
    const createEvent = createWatchEvent('create', '/test')
    const modifyEvent = createWatchEvent('modify', '/test')

    expect(isCreateEvent(createEvent)).toBe(true)
    expect(isCreateEvent(modifyEvent)).toBe(false)
  })

  it('isModifyEvent(event) returns true for modify events', () => {
    const modifyEvent = createWatchEvent('modify', '/test')
    const createEvent = createWatchEvent('create', '/test')

    expect(isModifyEvent(modifyEvent)).toBe(true)
    expect(isModifyEvent(createEvent)).toBe(false)
  })

  it('isDeleteEvent(event) returns true for delete events', () => {
    const deleteEvent = createWatchEvent('delete', '/test')
    const createEvent = createWatchEvent('create', '/test')

    expect(isDeleteEvent(deleteEvent)).toBe(true)
    expect(isDeleteEvent(createEvent)).toBe(false)
  })

  it('isRenameEvent(event) returns true for rename events', () => {
    const renameEvent = createWatchEvent('rename', '/old', '/new')
    const createEvent = createWatchEvent('create', '/test')

    expect(isRenameEvent(renameEvent)).toBe(true)
    expect(isRenameEvent(createEvent)).toBe(false)
  })

  it('Type guards work with all event types', () => {
    const events = [
      createWatchEvent('create', '/test'),
      createWatchEvent('modify', '/test'),
      createWatchEvent('delete', '/test'),
      createWatchEvent('rename', '/old', '/new'),
    ]

    expect(events.filter(isCreateEvent)).toHaveLength(1)
    expect(events.filter(isModifyEvent)).toHaveLength(1)
    expect(events.filter(isDeleteEvent)).toHaveLength(1)
    expect(events.filter(isRenameEvent)).toHaveLength(1)
  })
})
