/**
 * Tests for LookML generation
 */

import { describe, it, expect } from 'vitest'
import { generateLookML } from './generate-lookml'
import type { DatabaseSchema, DatabaseTable } from '../types/lookml'

describe('generateLookML', () => {
  describe('basic table generation', () => {
    it('should generate a simple view from a table', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'email', type: 'varchar' },
              { name: 'name', type: 'varchar' },
              { name: 'created_at', type: 'timestamp' },
            ],
          },
        ],
      }

      const result = generateLookML(schema)

      expect(result.views).toHaveLength(1)
      expect(result.views[0].name).toBe('users')
      expect(result.views[0].sqlTableName).toBe('users')
    })

    it('should include schema in table name when provided', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            schema: 'public',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema)

      expect(result.views[0].sqlTableName).toBe('public.users')
    })
  })

  describe('dimension generation', () => {
    it('should generate dimensions from columns', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'products',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'name', type: 'varchar' },
              { name: 'price', type: 'decimal' },
              { name: 'in_stock', type: 'boolean' },
            ],
          },
        ],
      }

      const result = generateLookML(schema)
      const view = result.views[0]

      expect(view.dimensions).toHaveLength(4)

      // Check primary key dimension
      const idDim = view.dimensions.find(d => d.name === 'id')
      expect(idDim).toBeDefined()
      expect(idDim?.type).toBe('number')
      expect(idDim?.primaryKey).toBe(true)
      expect(idDim?.sql).toBe('${TABLE}.id')

      // Check string dimension
      const nameDim = view.dimensions.find(d => d.name === 'name')
      expect(nameDim).toBeDefined()
      expect(nameDim?.type).toBe('string')

      // Check numeric dimension
      const priceDim = view.dimensions.find(d => d.name === 'price')
      expect(priceDim).toBeDefined()
      expect(priceDim?.type).toBe('number')

      // Check boolean dimension
      const stockDim = view.dimensions.find(d => d.name === 'in_stock')
      expect(stockDim).toBeDefined()
      expect(stockDim?.type).toBe('yesno')
    })

    it('should convert time columns to dimension groups', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'created_at', type: 'timestamp' },
              { name: 'shipped_date', type: 'date' },
            ],
          },
        ],
      }

      const result = generateLookML(schema)
      const view = result.views[0]

      expect(view.dimensionGroups).toBeDefined()
      expect(view.dimensionGroups).toHaveLength(2)

      // Check created_at dimension group
      const createdDimGroup = view.dimensionGroups?.find(d => d.name === 'created')
      expect(createdDimGroup).toBeDefined()
      expect(createdDimGroup?.type).toBe('time')
      expect(createdDimGroup?.timeframes).toContain('date')
      expect(createdDimGroup?.timeframes).toContain('month')
      expect(createdDimGroup?.timeframes).toContain('year')
      expect(createdDimGroup?.sql).toBe('${TABLE}.created_at')
      expect(createdDimGroup?.datatype).toBe('timestamp')

      // Check shipped_date dimension group
      const shippedDimGroup = view.dimensionGroups?.find(d => d.name === 'shipped')
      expect(shippedDimGroup).toBeDefined()
      expect(shippedDimGroup?.datatype).toBe('date')
    })

    it('should generate labels from column names', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'first_name', type: 'varchar' },
              { name: 'last_name', type: 'varchar' },
            ],
          },
        ],
      }

      const result = generateLookML(schema)
      const view = result.views[0]

      const firstNameDim = view.dimensions.find(d => d.name === 'first_name')
      expect(firstNameDim?.label).toBe('First Name')

      const lastNameDim = view.dimensions.find(d => d.name === 'last_name')
      expect(lastNameDim?.label).toBe('Last Name')
    })
  })

  describe('measure generation', () => {
    it('should generate count measure by default', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema)
      const view = result.views[0]

      expect(view.measures).toHaveLength(1)
      expect(view.measures[0].name).toBe('count')
      expect(view.measures[0].type).toBe('count')
    })

    it('should generate sum and average measures for numeric columns', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'amount', type: 'decimal' },
              { name: 'quantity', type: 'integer' },
            ],
          },
        ],
      }

      const result = generateLookML(schema)
      const view = result.views[0]

      // Should have count + sum/avg for amount + sum/avg for quantity
      expect(view.measures.length).toBeGreaterThan(1)

      // Check amount measures
      const totalAmount = view.measures.find(m => m.name === 'total_amount')
      expect(totalAmount).toBeDefined()
      expect(totalAmount?.type).toBe('sum')
      expect(totalAmount?.sql).toBe('${TABLE}.amount')
      expect(totalAmount?.valueFormat).toBe('usd')

      const avgAmount = view.measures.find(m => m.name === 'average_amount')
      expect(avgAmount).toBeDefined()
      expect(avgAmount?.type).toBe('average')
      expect(avgAmount?.valueFormat).toBe('usd')

      // Check quantity measures
      const totalQuantity = view.measures.find(m => m.name === 'total_quantity')
      expect(totalQuantity).toBeDefined()
      expect(totalQuantity?.type).toBe('sum')
    })

    it('should not generate measures when generateMeasures is false', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'amount', type: 'decimal' },
            ],
          },
        ],
      }

      const result = generateLookML(schema, { generateMeasures: false })
      const view = result.views[0]

      expect(view.measures).toHaveLength(0)
    })

    it('should add drill fields to count measure', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'customers',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'name', type: 'varchar' },
              { name: 'email', type: 'varchar' },
            ],
          },
        ],
      }

      const result = generateLookML(schema)
      const view = result.views[0]

      const countMeasure = view.measures.find(m => m.name === 'count')
      expect(countMeasure?.drillFields).toBeDefined()
      expect(countMeasure?.drillFields).toContain('id')
      expect(countMeasure?.drillFields).toContain('name')
      expect(countMeasure?.drillFields).toContain('email')
    })
  })

  describe('join generation', () => {
    it('should infer joins from foreign keys', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              {
                name: 'customer_id',
                type: 'integer',
                foreignKey: { table: 'customers', column: 'id' },
              },
            ],
          },
          {
            name: 'customers',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema)
      const ordersExplore = result.model.explores.find(e => e.name === 'orders')

      expect(ordersExplore?.joins).toBeDefined()
      expect(ordersExplore?.joins).toHaveLength(1)

      const customerJoin = ordersExplore?.joins?.[0]
      expect(customerJoin?.name).toBe('customers')
      expect(customerJoin?.relationship).toBe('many_to_one')
      expect(customerJoin?.sqlOn).toBe('${orders.customer_id} = ${customers.id}')
    })

    it('should use left_outer join for nullable foreign keys', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              {
                name: 'customer_id',
                type: 'integer',
                nullable: true,
                foreignKey: { table: 'customers', column: 'id' },
              },
            ],
          },
          {
            name: 'customers',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema)
      const ordersExplore = result.model.explores.find(e => e.name === 'orders')
      const customerJoin = ordersExplore?.joins?.[0]

      expect(customerJoin?.type).toBe('left_outer')
    })

    it('should use inner join for non-nullable foreign keys', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              {
                name: 'customer_id',
                type: 'integer',
                nullable: false,
                foreignKey: { table: 'customers', column: 'id' },
              },
            ],
          },
          {
            name: 'customers',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema)
      const ordersExplore = result.model.explores.find(e => e.name === 'orders')
      const customerJoin = ordersExplore?.joins?.[0]

      expect(customerJoin?.type).toBe('inner')
    })

    it('should not infer joins when inferRelationships is false', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              {
                name: 'customer_id',
                type: 'integer',
                foreignKey: { table: 'customers', column: 'id' },
              },
            ],
          },
        ],
      }

      const result = generateLookML(schema, { inferRelationships: false })
      const ordersExplore = result.model.explores.find(e => e.name === 'orders')

      expect(ordersExplore?.joins).toBeUndefined()
    })
  })

  describe('explore generation', () => {
    it('should generate explores for each view', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
          {
            name: 'customers',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema)

      expect(result.model.explores).toHaveLength(2)
      expect(result.model.explores[0].name).toBe('orders')
      expect(result.model.explores[0].label).toBe('Orders')
      expect(result.model.explores[1].name).toBe('customers')
      expect(result.model.explores[1].label).toBe('Customers')
    })
  })

  describe('model generation', () => {
    it('should generate model with connection and includes', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema, { connection: 'production' })

      expect(result.model.connection).toBe('production')
      expect(result.model.includes).toContain('/views/orders.view.lkml')
    })

    it('should use default connection name if not provided', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema)

      expect(result.model.connection).toBe('database')
    })
  })

  describe('file generation', () => {
    it('should generate model and view files', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'amount', type: 'decimal' },
            ],
          },
        ],
      }

      const result = generateLookML(schema, { modelName: 'ecommerce' })

      expect(result.files).toHaveProperty('models/ecommerce.model.lkml')
      expect(result.files).toHaveProperty('views/orders.view.lkml')

      const modelFile = result.files['models/ecommerce.model.lkml']
      expect(modelFile).toContain('connection: "database"')
      expect(modelFile).toContain('include: "/views/orders.view.lkml"')
      expect(modelFile).toContain('explore: orders {')

      const viewFile = result.files['views/orders.view.lkml']
      expect(viewFile).toContain('view: orders {')
      expect(viewFile).toContain('dimension: id {')
      expect(viewFile).toContain('primary_key: yes')
      expect(viewFile).toContain('measure: count {')
      expect(viewFile).toContain('measure: total_amount {')
    })

    it('should format joins in explore correctly', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              {
                name: 'customer_id',
                type: 'integer',
                foreignKey: { table: 'customers', column: 'id' },
              },
            ],
          },
          {
            name: 'customers',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'name', type: 'varchar' },
            ],
          },
        ],
      }

      const result = generateLookML(schema)
      const modelFile = result.files['models/generated.model.lkml']

      expect(modelFile).toContain('join: customers {')
      expect(modelFile).toContain('type: inner')
      expect(modelFile).toContain('sql_on: ${orders.customer_id} = ${customers.id} ;;')
      expect(modelFile).toContain('relationship: many_to_one')
    })
  })

  describe('table filtering', () => {
    it('should only generate views for specified tables', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
          {
            name: 'customers',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
          {
            name: 'products',
            columns: [{ name: 'id', type: 'integer', primaryKey: true }],
          },
        ],
      }

      const result = generateLookML(schema, { tables: ['orders', 'customers'] })

      expect(result.views).toHaveLength(2)
      expect(result.views.map(v => v.name)).toEqual(['orders', 'customers'])
      expect(result.files).toHaveProperty('views/orders.view.lkml')
      expect(result.files).toHaveProperty('views/customers.view.lkml')
      expect(result.files).not.toHaveProperty('views/products.view.lkml')
    })
  })

  describe('complex schema', () => {
    it('should handle complex ecommerce schema', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'orders',
            schema: 'public',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              {
                name: 'customer_id',
                type: 'integer',
                foreignKey: { table: 'customers', column: 'id' },
              },
              { name: 'status', type: 'varchar' },
              { name: 'total_amount', type: 'decimal' },
              { name: 'created_at', type: 'timestamp' },
            ],
          },
          {
            name: 'order_items',
            schema: 'public',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              {
                name: 'order_id',
                type: 'integer',
                foreignKey: { table: 'orders', column: 'id' },
              },
              {
                name: 'product_id',
                type: 'integer',
                foreignKey: { table: 'products', column: 'id' },
              },
              { name: 'quantity', type: 'integer' },
              { name: 'price', type: 'decimal' },
            ],
          },
          {
            name: 'customers',
            schema: 'public',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'name', type: 'varchar' },
              { name: 'email', type: 'varchar' },
              { name: 'created_at', type: 'timestamp' },
            ],
          },
          {
            name: 'products',
            schema: 'public',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true },
              { name: 'name', type: 'varchar' },
              { name: 'category', type: 'varchar' },
              { name: 'price', type: 'decimal' },
            ],
          },
        ],
      }

      const result = generateLookML(schema, {
        connection: 'production',
        modelName: 'ecommerce',
      })

      // Check that all views were generated
      expect(result.views).toHaveLength(4)

      // Check that order_items has joins to both orders and products
      const orderItemsExplore = result.model.explores.find(e => e.name === 'order_items')
      expect(orderItemsExplore?.joins).toHaveLength(2)
      expect(orderItemsExplore?.joins?.map(j => j.name)).toContain('orders')
      expect(orderItemsExplore?.joins?.map(j => j.name)).toContain('products')

      // Check that measures were generated for numeric columns
      const ordersView = result.views.find(v => v.name === 'orders')
      const totalAmountMeasures = ordersView?.measures.filter(m =>
        m.name.includes('total_amount')
      )
      expect(totalAmountMeasures?.length).toBeGreaterThan(0)

      // Check that all files were generated
      expect(Object.keys(result.files)).toHaveLength(5) // 1 model + 4 views
      expect(result.files).toHaveProperty('models/ecommerce.model.lkml')
    })
  })
})
