/**
 * Generate LookML from database schema
 */

import type {
  DatabaseSchema,
  DatabaseTable,
  DatabaseColumn,
  GenerateLookMLOptions,
  GeneratedLookML,
  LookMLView,
  LookMLDimension,
  LookMLDimensionGroup,
  LookMLMeasure,
  LookMLExplore,
  LookMLJoin,
  LookMLModel,
  DimensionType,
  JoinType,
  JoinRelationship,
} from '../types/lookml'

/**
 * Map database column types to LookML dimension types
 */
function mapColumnTypeToDimensionType(columnType: string): DimensionType {
  const type = columnType.toLowerCase()

  // Time-related types
  if (type.includes('timestamp') || type.includes('datetime') || type.includes('date')) {
    return 'time'
  }

  // Numeric types
  if (
    type.includes('int') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('decimal') ||
    type.includes('numeric') ||
    type.includes('real')
  ) {
    return 'number'
  }

  // Boolean types
  if (type.includes('bool') || type.includes('bit')) {
    return 'yesno'
  }

  // Default to string
  return 'string'
}

/**
 * Generate LookML view from database table
 */
function generateView(table: DatabaseTable, options: GenerateLookMLOptions): LookMLView {
  const dimensions: LookMLDimension[] = []
  const dimensionGroups: LookMLDimensionGroup[] = []
  const measures: LookMLMeasure[] = []

  // Generate dimensions from columns
  for (const column of table.columns) {
    const dimensionType = mapColumnTypeToDimensionType(column.type)

    // Time dimensions become dimension groups
    if (dimensionType === 'time') {
      dimensionGroups.push({
        name: column.name.replace(/_at$/, '').replace(/_date$/, ''),
        type: 'time',
        timeframes: ['raw', 'date', 'week', 'month', 'quarter', 'year'],
        sql: `\${TABLE}.${column.name}`,
        datatype: column.type.toLowerCase().includes('timestamp') ? 'timestamp' : 'date',
      })
    } else {
      dimensions.push({
        name: column.name,
        type: dimensionType,
        sql: `\${TABLE}.${column.name}`,
        primaryKey: column.primaryKey || false,
        label: formatLabel(column.name),
      })
    }
  }

  // Generate common measures if enabled
  if (options.generateMeasures !== false) {
    // Always add count
    measures.push({
      name: 'count',
      type: 'count',
      label: `${formatLabel(table.name)} Count`,
      drillFields: getDrillFields(table),
    })

    // Add sum/average measures for numeric columns
    for (const column of table.columns) {
      const dimensionType = mapColumnTypeToDimensionType(column.type)

      if (dimensionType === 'number' && !column.primaryKey) {
        // Check if this looks like a monetary or quantity field
        const isAmount = column.name.toLowerCase().includes('amount') ||
                        column.name.toLowerCase().includes('price') ||
                        column.name.toLowerCase().includes('revenue') ||
                        column.name.toLowerCase().includes('cost')

        const isQuantity = column.name.toLowerCase().includes('quantity') ||
                          column.name.toLowerCase().includes('count')

        if (isAmount || isQuantity) {
          measures.push({
            name: `total_${column.name}`,
            type: 'sum',
            sql: `\${TABLE}.${column.name}`,
            label: `Total ${formatLabel(column.name)}`,
            valueFormat: isAmount ? 'usd' : undefined,
          })

          measures.push({
            name: `average_${column.name}`,
            type: 'average',
            sql: `\${TABLE}.${column.name}`,
            label: `Average ${formatLabel(column.name)}`,
            valueFormat: isAmount ? 'usd' : undefined,
          })
        }
      }
    }
  }

  return {
    name: table.name,
    sqlTableName: table.schema ? `${table.schema}.${table.name}` : table.name,
    dimensions,
    dimensionGroups: dimensionGroups.length > 0 ? dimensionGroups : undefined,
    measures,
  }
}

/**
 * Format column/table name as human-readable label
 */
function formatLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Get drill fields for a table (primary key + descriptive fields)
 */
function getDrillFields(table: DatabaseTable): string[] {
  const fields: string[] = []

  for (const column of table.columns) {
    if (column.primaryKey) {
      fields.push(column.name)
    } else if (
      column.name.toLowerCase().includes('name') ||
      column.name.toLowerCase().includes('title') ||
      column.name.toLowerCase().includes('email')
    ) {
      fields.push(column.name)
    }
  }

  return fields
}

/**
 * Infer joins from foreign key relationships
 */
function inferJoins(tables: DatabaseTable[]): Map<string, LookMLJoin[]> {
  const joinsByTable = new Map<string, LookMLJoin[]>()

  for (const table of tables) {
    const joins: LookMLJoin[] = []

    for (const column of table.columns) {
      if (column.foreignKey) {
        const targetTable = column.foreignKey.table
        const targetColumn = column.foreignKey.column

        // Determine join type based on column nullability
        const joinType: JoinType = column.nullable ? 'left_outer' : 'inner'

        // Determine relationship (many_to_one for most foreign keys)
        const relationship: JoinRelationship = 'many_to_one'

        joins.push({
          name: targetTable,
          type: joinType,
          sqlOn: `\${${table.name}.${column.name}} = \${${targetTable}.${targetColumn}}`,
          relationship,
        })
      }
    }

    if (joins.length > 0) {
      joinsByTable.set(table.name, joins)
    }
  }

  return joinsByTable
}

/**
 * Generate explores from views
 */
function generateExplores(
  views: LookMLView[],
  joinsByTable: Map<string, LookMLJoin[]>
): LookMLExplore[] {
  return views.map(view => ({
    name: view.name,
    label: formatLabel(view.name),
    description: `Explore ${formatLabel(view.name)}`,
    joins: joinsByTable.get(view.name),
  }))
}

/**
 * Format LookML dimension
 */
function formatDimension(dim: LookMLDimension): string {
  const lines: string[] = [`  dimension: ${dim.name} {`]

  if (dim.primaryKey) {
    lines.push('    primary_key: yes')
  }

  lines.push(`    type: ${dim.type}`)
  lines.push(`    sql: ${dim.sql} ;;`)

  if (dim.label) {
    lines.push(`    label: "${dim.label}"`)
  }

  if (dim.description) {
    lines.push(`    description: "${dim.description}"`)
  }

  if (dim.hidden) {
    lines.push('    hidden: yes')
  }

  lines.push('  }')
  return lines.join('\n')
}

/**
 * Format LookML dimension group
 */
function formatDimensionGroup(dimGroup: LookMLDimensionGroup): string {
  const lines: string[] = [`  dimension_group: ${dimGroup.name} {`]

  lines.push(`    type: ${dimGroup.type}`)
  lines.push(`    timeframes: [${dimGroup.timeframes.join(', ')}]`)
  lines.push(`    sql: ${dimGroup.sql} ;;`)

  if (dimGroup.datatype) {
    lines.push(`    datatype: ${dimGroup.datatype}`)
  }

  lines.push('  }')
  return lines.join('\n')
}

/**
 * Format LookML measure
 */
function formatMeasure(measure: LookMLMeasure): string {
  const lines: string[] = [`  measure: ${measure.name} {`]

  lines.push(`    type: ${measure.type}`)

  if (measure.sql) {
    lines.push(`    sql: ${measure.sql} ;;`)
  }

  if (measure.label) {
    lines.push(`    label: "${measure.label}"`)
  }

  if (measure.description) {
    lines.push(`    description: "${measure.description}"`)
  }

  if (measure.valueFormat) {
    lines.push(`    value_format_name: ${measure.valueFormat}`)
  }

  if (measure.drillFields && measure.drillFields.length > 0) {
    lines.push(`    drill_fields: [${measure.drillFields.join(', ')}]`)
  }

  lines.push('  }')
  return lines.join('\n')
}

/**
 * Format LookML view to file content
 */
function formatView(view: LookMLView): string {
  const lines: string[] = [
    `view: ${view.name} {`,
    `  sql_table_name: ${view.sqlTableName} ;;`,
    '',
  ]

  // Add dimensions
  for (const dimension of view.dimensions) {
    lines.push(formatDimension(dimension))
    lines.push('')
  }

  // Add dimension groups
  if (view.dimensionGroups) {
    for (const dimensionGroup of view.dimensionGroups) {
      lines.push(formatDimensionGroup(dimensionGroup))
      lines.push('')
    }
  }

  // Add measures
  for (const measure of view.measures) {
    lines.push(formatMeasure(measure))
    lines.push('')
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * Format LookML join
 */
function formatJoin(join: LookMLJoin): string {
  const lines: string[] = [`  join: ${join.name} {`]

  lines.push(`    type: ${join.type}`)
  lines.push(`    sql_on: ${join.sqlOn} ;;`)
  lines.push(`    relationship: ${join.relationship}`)

  if (join.fields) {
    lines.push(`    fields: [${join.fields.join(', ')}]`)
  }

  lines.push('  }')
  return lines.join('\n')
}

/**
 * Format LookML explore
 */
function formatExplore(explore: LookMLExplore): string {
  const lines: string[] = [`explore: ${explore.name} {`]

  if (explore.label) {
    lines.push(`  label: "${explore.label}"`)
  }

  if (explore.description) {
    lines.push(`  description: "${explore.description}"`)
  }

  if (explore.fields) {
    lines.push(`  fields: [${explore.fields.join(', ')}]`)
  }

  if (explore.joins) {
    lines.push('')
    for (const join of explore.joins) {
      lines.push(formatJoin(join))
      lines.push('')
    }
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * Format LookML model to file content
 */
function formatModel(model: LookMLModel): string {
  const lines: string[] = [
    `connection: "${model.connection}"`,
    '',
  ]

  // Add includes
  for (const include of model.includes) {
    lines.push(`include: "${include}"`)
  }

  lines.push('')

  // Add explores
  for (const explore of model.explores) {
    lines.push(formatExplore(explore))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate LookML from database schema
 */
export function generateLookML(
  schema: DatabaseSchema,
  options: GenerateLookMLOptions = {}
): GeneratedLookML {
  const {
    connection = 'database',
    inferRelationships = true,
    modelName = 'generated',
  } = options

  // Filter tables if specific tables are requested
  const tables = options.tables
    ? schema.tables.filter(t => options.tables!.includes(t.name))
    : schema.tables

  // Generate views from tables
  const views = tables.map(table => generateView(table, options))

  // Infer joins from foreign keys
  const joinsByTable = inferRelationships ? inferJoins(tables) : new Map()

  // Generate explores
  const explores = generateExplores(views, joinsByTable)

  // Create model
  const model: LookMLModel = {
    connection,
    includes: views.map(v => `/views/${v.name}.view.lkml`),
    explores,
  }

  // Generate file contents
  const files: Record<string, string> = {}

  // Model file
  files[`models/${modelName}.model.lkml`] = formatModel(model)

  // View files
  for (const view of views) {
    files[`views/${view.name}.view.lkml`] = formatView(view)
  }

  return {
    files,
    views,
    model,
  }
}
