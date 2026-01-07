/**
 * CRUD Mixin Tests
 *
 * Tests for the CRUDMixin that provides CRUD operations for Durable Objects.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DOCore } from '../src/index.js';
import { CRUDMixin, CRUDBase } from '../src/crud-mixin.js';
import { createMockState, createMockStorage } from './helpers.js';
// Create a test class using the mixin
class TestDO extends CRUDMixin(DOCore) {
    getStorage() {
        return this.ctx.storage;
    }
}
// Create a test class using CRUDBase
class TestDOBase extends CRUDBase {
    ctx;
    constructor(ctx, _env) {
        super();
        this.ctx = ctx;
    }
    getStorage() {
        return this.ctx.storage;
    }
}
describe('CRUDMixin', () => {
    let ctx;
    let instance;
    beforeEach(() => {
        ctx = createMockState();
        instance = new TestDO(ctx, {});
    });
    describe('get()', () => {
        it('should return null for non-existent document', async () => {
            const result = await instance.get('users', 'nonexistent');
            expect(result).toBeNull();
        });
        it('should return document if it exists', async () => {
            const user = { id: '123', name: 'Alice', email: 'alice@example.com' };
            await ctx.storage.put('users:123', user);
            const result = await instance.get('users', '123');
            expect(result).toEqual(user);
        });
    });
    describe('create()', () => {
        it('should create document with auto-generated id', async () => {
            const data = { name: 'Bob', email: 'bob@example.com' };
            const created = await instance.create('users', data);
            expect(created.id).toBeDefined();
            expect(created.id).toHaveLength(36); // UUID length
            expect(created.name).toBe('Bob');
            expect(created.email).toBe('bob@example.com');
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
        });
        it('should create document with provided id', async () => {
            const data = { id: 'custom-id', name: 'Charlie', email: 'charlie@example.com' };
            const created = await instance.create('users', data);
            expect(created.id).toBe('custom-id');
        });
        it('should store document in storage with collection prefix', async () => {
            const data = { id: 'test-id', name: 'David', email: 'david@example.com' };
            await instance.create('users', data);
            const stored = await ctx.storage.get('users:test-id');
            expect(stored).toBeDefined();
            expect(stored.name).toBe('David');
        });
        it('should preserve custom timestamps if provided', async () => {
            const createdAt = 1000;
            const updatedAt = 2000;
            const data = {
                name: 'Eve',
                email: 'eve@example.com',
                createdAt,
                updatedAt,
            };
            const created = await instance.create('users', data);
            expect(created.createdAt).toBe(createdAt);
            expect(created.updatedAt).toBe(updatedAt);
        });
    });
    describe('update()', () => {
        it('should return null if document does not exist', async () => {
            const result = await instance.update('users', 'nonexistent', { name: 'Updated' });
            expect(result).toBeNull();
        });
        it('should update existing document', async () => {
            const user = { id: '123', name: 'Frank', email: 'frank@example.com', createdAt: 1000 };
            await ctx.storage.put('users:123', user);
            const updated = await instance.update('users', '123', { name: 'Franklin' });
            expect(updated).not.toBeNull();
            expect(updated.name).toBe('Franklin');
            expect(updated.email).toBe('frank@example.com');
            expect(updated.id).toBe('123');
        });
        it('should update the updatedAt timestamp', async () => {
            const user = { id: '123', name: 'Grace', email: 'grace@example.com', updatedAt: 1000 };
            await ctx.storage.put('users:123', user);
            const before = Date.now();
            const updated = await instance.update('users', '123', { name: 'Gracie' });
            const after = Date.now();
            expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
            expect(updated.updatedAt).toBeLessThanOrEqual(after);
        });
        it('should not allow changing the id', async () => {
            const user = { id: '123', name: 'Henry', email: 'henry@example.com' };
            await ctx.storage.put('users:123', user);
            const updated = await instance.update('users', '123', { id: 'new-id', name: 'Harry' });
            expect(updated.id).toBe('123');
        });
    });
    describe('delete()', () => {
        it('should return false if document does not exist', async () => {
            const result = await instance.delete('users', 'nonexistent');
            expect(result).toBe(false);
        });
        it('should delete existing document', async () => {
            const user = { id: '123', name: 'Ivy', email: 'ivy@example.com' };
            await ctx.storage.put('users:123', user);
            const result = await instance.delete('users', '123');
            expect(result).toBe(true);
            const afterDelete = await ctx.storage.get('users:123');
            expect(afterDelete).toBeUndefined();
        });
    });
    describe('list()', () => {
        beforeEach(async () => {
            // Seed test data
            await ctx.storage.put('users:alice', { id: 'alice', name: 'Alice', email: 'alice@example.com' });
            await ctx.storage.put('users:bob', { id: 'bob', name: 'Bob', email: 'bob@example.com' });
            await ctx.storage.put('users:charlie', { id: 'charlie', name: 'Charlie', email: 'charlie@example.com' });
            await ctx.storage.put('posts:1', { id: '1', title: 'Post 1' });
        });
        it('should list documents in a collection', async () => {
            const users = await instance.list('users');
            expect(users).toHaveLength(3);
            expect(users.map(u => u.name)).toContain('Alice');
            expect(users.map(u => u.name)).toContain('Bob');
            expect(users.map(u => u.name)).toContain('Charlie');
        });
        it('should not include documents from other collections', async () => {
            const users = await instance.list('users');
            expect(users.every(u => u.name !== undefined)).toBe(true);
            expect(users.some(u => u.title === 'Post 1')).toBe(false);
        });
        it('should respect limit option', async () => {
            const users = await instance.list('users', { limit: 2 });
            expect(users).toHaveLength(2);
        });
        it('should respect offset option', async () => {
            const allUsers = await instance.list('users');
            const offsetUsers = await instance.list('users', { offset: 1 });
            expect(offsetUsers).toHaveLength(2);
            expect(offsetUsers[0]).toEqual(allUsers[1]);
        });
        it('should return empty array for non-existent collection', async () => {
            const empty = await instance.list('nonexistent');
            expect(empty).toEqual([]);
        });
    });
    describe('exists()', () => {
        it('should return false if document does not exist', async () => {
            const result = await instance.exists('users', 'nonexistent');
            expect(result).toBe(false);
        });
        it('should return true if document exists', async () => {
            await ctx.storage.put('users:123', { id: '123', name: 'Test' });
            const result = await instance.exists('users', '123');
            expect(result).toBe(true);
        });
    });
    describe('count()', () => {
        it('should return 0 for empty collection', async () => {
            const count = await instance.count('empty');
            expect(count).toBe(0);
        });
        it('should return correct count', async () => {
            await ctx.storage.put('items:1', { id: '1' });
            await ctx.storage.put('items:2', { id: '2' });
            await ctx.storage.put('items:3', { id: '3' });
            const count = await instance.count('items');
            expect(count).toBe(3);
        });
    });
    describe('upsert()', () => {
        it('should create document if it does not exist', async () => {
            const data = { name: 'Jack', email: 'jack@example.com' };
            const result = await instance.upsert('users', 'jack', data);
            expect(result.id).toBe('jack');
            expect(result.name).toBe('Jack');
            expect(result.createdAt).toBeDefined();
        });
        it('should update document if it exists', async () => {
            const existing = { id: 'kate', name: 'Kate', email: 'kate@example.com', createdAt: 1000 };
            await ctx.storage.put('users:kate', existing);
            const result = await instance.upsert('users', 'kate', { name: 'Katherine' });
            expect(result.id).toBe('kate');
            expect(result.name).toBe('Katherine');
            expect(result.email).toBe('kate@example.com');
        });
    });
    describe('deleteCollection()', () => {
        it('should return 0 for empty collection', async () => {
            const count = await instance.deleteCollection('empty');
            expect(count).toBe(0);
        });
        it('should delete all documents in collection', async () => {
            await ctx.storage.put('temp:1', { id: '1' });
            await ctx.storage.put('temp:2', { id: '2' });
            await ctx.storage.put('temp:3', { id: '3' });
            await ctx.storage.put('other:1', { id: '1' });
            const count = await instance.deleteCollection('temp');
            expect(count).toBe(3);
            // Verify temp collection is empty
            const tempCount = await instance.count('temp');
            expect(tempCount).toBe(0);
            // Verify other collection is untouched
            const otherCount = await instance.count('other');
            expect(otherCount).toBe(1);
        });
    });
    describe('getMany()', () => {
        beforeEach(async () => {
            await ctx.storage.put('users:alice', { id: 'alice', name: 'Alice' });
            await ctx.storage.put('users:bob', { id: 'bob', name: 'Bob' });
            await ctx.storage.put('users:charlie', { id: 'charlie', name: 'Charlie' });
        });
        it('should return empty map for no ids', async () => {
            const result = await instance.getMany('users', []);
            expect(result.size).toBe(0);
        });
        it('should return map of found documents', async () => {
            const result = await instance.getMany('users', ['alice', 'bob']);
            expect(result.size).toBe(2);
            expect(result.get('alice')?.name).toBe('Alice');
            expect(result.get('bob')?.name).toBe('Bob');
        });
        it('should not include non-existent ids', async () => {
            const result = await instance.getMany('users', ['alice', 'nonexistent']);
            expect(result.size).toBe(1);
            expect(result.has('nonexistent')).toBe(false);
        });
    });
    describe('createMany()', () => {
        it('should create multiple documents', async () => {
            const docs = [
                { name: 'Leo', email: 'leo@example.com' },
                { name: 'Mia', email: 'mia@example.com' },
            ];
            const created = await instance.createMany('users', docs);
            expect(created).toHaveLength(2);
            expect(created[0]?.id).toBeDefined();
            expect(created[1]?.id).toBeDefined();
            expect(created[0]?.name).toBe('Leo');
            expect(created[1]?.name).toBe('Mia');
        });
        it('should respect provided ids', async () => {
            const docs = [
                { id: 'custom-1', name: 'Nina' },
                { id: 'custom-2', name: 'Oscar' },
            ];
            const created = await instance.createMany('users', docs);
            expect(created[0]?.id).toBe('custom-1');
            expect(created[1]?.id).toBe('custom-2');
        });
        it('should store all documents in storage', async () => {
            const docs = [
                { id: 'test-1', name: 'Test1' },
                { id: 'test-2', name: 'Test2' },
            ];
            await instance.createMany('users', docs);
            const stored1 = await ctx.storage.get('users:test-1');
            const stored2 = await ctx.storage.get('users:test-2');
            expect(stored1).toBeDefined();
            expect(stored2).toBeDefined();
        });
    });
    describe('deleteMany()', () => {
        beforeEach(async () => {
            await ctx.storage.put('users:1', { id: '1' });
            await ctx.storage.put('users:2', { id: '2' });
            await ctx.storage.put('users:3', { id: '3' });
        });
        it('should delete multiple documents', async () => {
            const count = await instance.deleteMany('users', ['1', '2']);
            expect(count).toBe(2);
            const remaining = await instance.list('users');
            expect(remaining).toHaveLength(1);
        });
        it('should handle non-existent ids gracefully', async () => {
            const count = await instance.deleteMany('users', ['1', 'nonexistent']);
            expect(count).toBe(1);
        });
        it('should return 0 for empty id array', async () => {
            const count = await instance.deleteMany('users', []);
            expect(count).toBe(0);
        });
    });
});
describe('CRUDBase', () => {
    let ctx;
    let instance;
    beforeEach(() => {
        ctx = createMockState();
        instance = new TestDOBase(ctx, {});
    });
    describe('basic operations', () => {
        it('should support get()', async () => {
            await ctx.storage.put('users:123', { id: '123', name: 'Test' });
            const result = await instance.get('users', '123');
            expect(result?.name).toBe('Test');
        });
        it('should support create()', async () => {
            const created = await instance.create('users', { name: 'Test' });
            expect(created.id).toBeDefined();
            expect(created.name).toBe('Test');
        });
        it('should support update()', async () => {
            await ctx.storage.put('users:123', { id: '123', name: 'Original' });
            const updated = await instance.update('users', '123', { name: 'Updated' });
            expect(updated?.name).toBe('Updated');
        });
        it('should support delete()', async () => {
            await ctx.storage.put('users:123', { id: '123' });
            const deleted = await instance.delete('users', '123');
            expect(deleted).toBe(true);
        });
        it('should support list()', async () => {
            await ctx.storage.put('users:1', { id: '1' });
            await ctx.storage.put('users:2', { id: '2' });
            const list = await instance.list('users');
            expect(list).toHaveLength(2);
        });
    });
    it('should work the same as the mixin version', async () => {
        // The CRUDBase should produce identical results to CRUDMixin
        const mixin = new TestDO(ctx, {});
        const base = new TestDOBase(ctx, {});
        // Create with same data
        const mixinDoc = await mixin.create('test', { id: 'same', name: 'Test' });
        await instance.delete('test', 'same'); // Clean up for base test
        const baseDoc = await base.create('test', { id: 'same', name: 'Test' });
        // Verify same structure
        expect(mixinDoc.id).toBe(baseDoc.id);
        expect(mixinDoc.name).toBe(baseDoc.name);
    });
});
describe('StorageProvider interface', () => {
    it('should allow custom classes to implement StorageProvider', () => {
        class CustomProvider {
            storage;
            constructor(storage) {
                this.storage = storage;
            }
            getStorage() {
                return this.storage;
            }
        }
        const storage = createMockStorage();
        const provider = new CustomProvider(storage);
        expect(provider.getStorage()).toBe(storage);
    });
});
