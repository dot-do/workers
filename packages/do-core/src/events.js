/**
 * EventsMixin - Event handling and event sourcing for Durable Objects
 *
 * Provides:
 * - Type-safe event pub/sub system (emit/on/once/off)
 * - Event sourcing support (appendEvent, getEvents, rebuildState)
 * - WebSocket broadcast integration
 * - Repository-based storage abstraction
 *
 * @module events
 */
import { EventsRepository } from './events-repository';
/**
 * Abstract base class providing event handling functionality.
 *
 * Use this as a mixin by having your DO class extend it or
 * compose it with other mixins.
 *
 * ## Event Pub/Sub
 * ```typescript
 * class MyDO extends EventsMixin {
 *   constructor(ctx: DOState, env: Env) {
 *     super(ctx, env)
 *
 *     this.on('user:login', (data) => {
 *       console.log('User logged in:', data.userId)
 *     })
 *   }
 *
 *   async handleLogin(userId: string) {
 *     // ... perform login
 *     await this.emit('user:login', { userId, timestamp: Date.now() })
 *   }
 * }
 * ```
 *
 * ## Event Sourcing
 * ```typescript
 * class OrderDO extends EventsMixin {
 *   private total = 0
 *
 *   async addItem(item: Item) {
 *     await this.appendEvent({
 *       type: 'item:added',
 *       data: item,
 *     })
 *     this.total += item.price
 *   }
 *
 *   async rebuildState(): Promise<void> {
 *     this.total = 0
 *     const events = await this.getEvents()
 *     for (const event of events) {
 *       if (event.type === 'item:added') {
 *         this.total += (event.data as Item).price
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class EventsMixin {
    ctx;
    env;
    /** In-memory subscribers by event type */
    subscribers = new Map();
    /** Event sourcing options */
    eventOptions;
    /** Events repository for data access */
    eventsRepository;
    constructor(ctx, env, options) {
        this.ctx = ctx;
        this.env = env;
        this.eventOptions = {
            eventPrefix: options?.eventPrefix ?? 'events:',
            maxEventsInMemory: options?.maxEventsInMemory ?? 1000,
        };
        // Initialize repository with storage and options
        this.eventsRepository = new EventsRepository(ctx.storage, this.eventOptions.eventPrefix.replace(/:$/, ''), // Remove trailing colon
        { maxEventsInMemory: this.eventOptions.maxEventsInMemory });
    }
    /**
     * Get the events repository for direct access if needed
     */
    getEventsRepository() {
        return this.eventsRepository;
    }
    // ============================================
    // Event Pub/Sub Methods
    // ============================================
    /**
     * Emit an event to all subscribers
     *
     * @param event - Event type (e.g., 'user:created')
     * @param data - Event data payload
     * @returns Promise that resolves when all handlers complete
     */
    async emit(event, data) {
        const subs = this.subscribers.get(event);
        if (!subs || subs.size === 0)
            return;
        const toRemove = [];
        for (const sub of subs) {
            try {
                await sub.handler(data);
            }
            catch (error) {
                // Log error but don't stop other handlers
                console.error(`Event handler error for '${event}':`, error);
            }
            if (sub.once) {
                toRemove.push(sub);
            }
        }
        // Remove once handlers after execution
        for (const sub of toRemove) {
            subs.delete(sub);
        }
    }
    /**
     * Subscribe to an event
     *
     * @param event - Event type to listen for
     * @param handler - Handler function called when event fires
     * @returns Unsubscribe function
     */
    on(event, handler) {
        return this.addSubscriber(event, handler, false);
    }
    /**
     * Subscribe to an event once (auto-unsubscribe after first call)
     *
     * @param event - Event type to listen for
     * @param handler - Handler function called when event fires
     * @returns Unsubscribe function
     */
    once(event, handler) {
        return this.addSubscriber(event, handler, true);
    }
    /**
     * Unsubscribe from an event
     *
     * @param event - Event type
     * @param handler - The handler to remove
     */
    off(event, handler) {
        const subs = this.subscribers.get(event);
        if (!subs)
            return;
        for (const sub of subs) {
            if (sub.handler === handler) {
                subs.delete(sub);
                break;
            }
        }
    }
    /**
     * Remove all subscribers for an event (or all events if no type specified)
     *
     * @param event - Optional event type to clear
     */
    removeAllListeners(event) {
        if (event) {
            this.subscribers.delete(event);
        }
        else {
            this.subscribers.clear();
        }
    }
    /**
     * Get the number of listeners for an event
     *
     * @param event - Event type
     * @returns Number of listeners
     */
    listenerCount(event) {
        return this.subscribers.get(event)?.size ?? 0;
    }
    /**
     * Get all registered event types
     *
     * @returns Array of event type strings
     */
    eventNames() {
        return Array.from(this.subscribers.keys());
    }
    addSubscriber(event, handler, once) {
        let subs = this.subscribers.get(event);
        if (!subs) {
            subs = new Set();
            this.subscribers.set(event, subs);
        }
        const subscriber = { handler, once };
        subs.add(subscriber);
        return () => {
            subs.delete(subscriber);
        };
    }
    // ============================================
    // Event Sourcing Methods
    // ============================================
    /**
     * Append an event to the event log
     *
     * This persists the event to storage via the repository and updates the in-memory cache.
     * Events are stored with timestamp-based keys for ordering.
     *
     * @param event - Partial event (id and timestamp will be generated if missing)
     * @returns The complete persisted event
     */
    async appendEvent(event) {
        const completeEvent = {
            id: event.id ?? crypto.randomUUID(),
            type: event.type,
            data: event.data,
            timestamp: event.timestamp ?? Date.now(),
            aggregateId: event.aggregateId,
            version: event.version,
            metadata: event.metadata,
        };
        // Persist via repository (handles caching internally)
        await this.eventsRepository.save(completeEvent);
        // Emit the event to subscribers
        await this.emit(completeEvent.type, completeEvent.data);
        return completeEvent;
    }
    /**
     * Get events from the event log
     *
     * @param since - Optional timestamp to get events after
     * @param options - Optional query options
     * @returns Array of events ordered by timestamp
     */
    async getEvents(since, options) {
        // Use repository for data access
        const events = await this.eventsRepository.findSince({
            since,
            type: options?.type,
            aggregateId: options?.aggregateId,
            limit: options?.limit,
        });
        return events;
    }
    /**
     * Rebuild state from event log
     *
     * Override this method in your subclass to implement state reconstruction:
     *
     * ```typescript
     * async rebuildState(): Promise<void> {
     *   this.state = initialState()
     *   const events = await this.getEvents()
     *   for (const event of events) {
     *     this.applyEvent(event)
     *   }
     * }
     * ```
     */
    async rebuildState() {
        // Default implementation: reload events from storage via repository
        await this.eventsRepository.reloadCache();
        // Subclasses should override to apply events to state
    }
    /**
     * Clear all events from storage and cache
     *
     * Use with caution - this permanently deletes the event log.
     */
    async clearEvents() {
        await this.eventsRepository.clear();
    }
    /**
     * Get the total number of events in storage
     */
    async getEventCount() {
        return this.eventsRepository.count();
    }
    // ============================================
    // WebSocket Broadcast Integration
    // ============================================
    /**
     * Broadcast an event to all connected WebSockets
     *
     * @param event - Event type
     * @param data - Event data
     * @param options - Broadcast options
     * @returns Number of WebSockets the message was sent to
     */
    async broadcast(event, data, options) {
        const sockets = options?.tag
            ? this.ctx.getWebSockets(options.tag)
            : this.ctx.getWebSockets();
        const message = JSON.stringify({ event, data, timestamp: Date.now() });
        let sent = 0;
        for (const ws of sockets) {
            try {
                // Check exclusion filter
                if (options?.excludeAttachment) {
                    const attachment = ws.deserializeAttachment?.();
                    if (attachment?.[options.excludeAttachment.key] === options.excludeAttachment.value) {
                        continue;
                    }
                }
                // Only send to open sockets
                if (ws.readyState === 1) { // WebSocket.OPEN
                    ws.send(message);
                    sent++;
                }
            }
            catch {
                // Socket is dead, ignore
            }
        }
        return sent;
    }
    /**
     * Broadcast to a specific room (WebSocket tag)
     *
     * Convenience method equivalent to broadcast(event, data, { tag: `room:${room}` })
     *
     * @param room - Room name (will be prefixed with 'room:')
     * @param event - Event type
     * @param data - Event data
     * @returns Number of WebSockets the message was sent to
     */
    async broadcastToRoom(room, event, data) {
        return this.broadcast(event, data, { tag: `room:${room}` });
    }
    /**
     * Emit an event and broadcast it to WebSockets
     *
     * Combines local event emission with WebSocket broadcast.
     *
     * @param event - Event type
     * @param data - Event data
     * @param broadcastOptions - Optional broadcast options
     */
    async emitAndBroadcast(event, data, broadcastOptions) {
        const listeners = this.listenerCount(event);
        await this.emit(event, data);
        const sockets = await this.broadcast(event, data, broadcastOptions);
        return { listeners, sockets };
    }
    /**
     * Append an event and broadcast it
     *
     * Combines event sourcing with WebSocket broadcast.
     *
     * @param event - Event to append
     * @param broadcastOptions - Optional broadcast options
     */
    async appendAndBroadcast(event, broadcastOptions) {
        const persistedEvent = await this.appendEvent(event);
        const sockets = await this.broadcast(persistedEvent.type, persistedEvent.data, broadcastOptions);
        return { event: persistedEvent, sockets };
    }
}
