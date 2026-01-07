/**
 * Drizzle ORM Schema Management and Migrations
 *
 * This module will provide Drizzle-based schema management for Durable Objects.
 * Currently a stub - implementation comes in GREEN phase.
 *
 * @packageDocumentation
 */
// Stub class - will throw NotImplementedError in tests
export class DrizzleMigrations {
    constructor(_config) {
        // Not implemented yet
    }
    async generate(_name) {
        throw new Error('Not implemented');
    }
    async run() {
        throw new Error('Not implemented');
    }
    async runSingle(_migrationId) {
        throw new Error('Not implemented');
    }
    async rollback(_steps) {
        throw new Error('Not implemented');
    }
    async rollbackTo(_migrationId) {
        throw new Error('Not implemented');
    }
    async getStatus() {
        throw new Error('Not implemented');
    }
    async getPending() {
        throw new Error('Not implemented');
    }
    async getApplied() {
        throw new Error('Not implemented');
    }
}
export class SchemaValidator {
    async validate(_schema) {
        throw new Error('Not implemented');
    }
    async diff(_current, _target) {
        throw new Error('Not implemented');
    }
    async introspect() {
        throw new Error('Not implemented');
    }
}
export function createMigrations(_config) {
    throw new Error('Not implemented');
}
export function createSchemaValidator() {
    throw new Error('Not implemented');
}
