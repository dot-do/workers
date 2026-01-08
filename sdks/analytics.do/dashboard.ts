/**
 * analytics.do/dashboard - Dashboard Layout and Section Management
 *
 * Provides layout management, section composition, and responsive grid
 * functionality for analytics dashboards.
 *
 * @example
 * ```typescript
 * import { DashboardLayout } from 'analytics.do/dashboard'
 *
 * // Create a dashboard with sections
 * const dashboard = new DashboardLayout({
 *   name: 'Growth Metrics',
 *   columns: 12,
 *   rowHeight: 80,
 * })
 *
 * // Add a section with widgets
 * dashboard.addSection({
 *   id: 'overview',
 *   title: 'Overview',
 *   widgets: [
 *     { type: 'metric', title: 'MRR', query: { metrics: ['mrr'] } },
 *     { type: 'chart', title: 'Signups', query: { metrics: ['signups'] } }
 *   ]
 * })
 *
 * // Auto-layout all widgets
 * dashboard.autoLayout()
 *
 * // Export dashboard configuration
 * const config = dashboard.toJSON()
 * ```
 */

import type { Dashboard, DashboardWidget, DashboardFilter } from './index'

/**
 * Section grouping related widgets
 */
export interface DashboardSection {
  id: string
  title?: string
  description?: string
  widgets: DashboardWidget[]
  collapsed?: boolean
  /** Section spans full width */
  fullWidth?: boolean
}

/**
 * Grid layout configuration
 */
export interface GridConfig {
  /** Number of columns in the grid (default: 12) */
  columns: number
  /** Height of each row in pixels (default: 80) */
  rowHeight: number
  /** Gap between widgets in pixels (default: 16) */
  gap: number
  /** Breakpoints for responsive layout */
  breakpoints?: {
    mobile: number // default: 640
    tablet: number // default: 768
    desktop: number // default: 1024
  }
}

/**
 * Layout strategy for auto-positioning widgets
 */
export type LayoutStrategy = 'flow' | 'grid' | 'masonry' | 'manual'

/**
 * Widget size presets for common layouts
 */
export interface WidgetSizePreset {
  width: number
  height: number
}

export const WIDGET_SIZE_PRESETS: Record<string, WidgetSizePreset> = {
  small: { width: 3, height: 1 }, // 1/4 width, 1 row
  medium: { width: 6, height: 2 }, // 1/2 width, 2 rows
  large: { width: 12, height: 3 }, // full width, 3 rows
  metric: { width: 3, height: 1 }, // compact metric display
  chart: { width: 6, height: 3 }, // standard chart
  table: { width: 12, height: 4 }, // full-width table
}

/**
 * Dashboard layout manager
 */
export class DashboardLayout {
  private id: string
  private name: string
  private description?: string
  private sections: DashboardSection[] = []
  private filters: DashboardFilter[] = []
  private gridConfig: GridConfig
  private layoutStrategy: LayoutStrategy = 'flow'
  private shared: boolean = false
  private createdAt: Date
  private updatedAt: Date

  constructor(options: {
    id?: string
    name: string
    description?: string
    columns?: number
    rowHeight?: number
    gap?: number
    layoutStrategy?: LayoutStrategy
    shared?: boolean
  }) {
    this.id = options.id || this.generateId()
    this.name = options.name
    this.description = options.description
    this.layoutStrategy = options.layoutStrategy || 'flow'
    this.shared = options.shared || false
    this.createdAt = new Date()
    this.updatedAt = new Date()

    this.gridConfig = {
      columns: options.columns || 12,
      rowHeight: options.rowHeight || 80,
      gap: options.gap || 16,
      breakpoints: {
        mobile: 640,
        tablet: 768,
        desktop: 1024,
      },
    }
  }

  /**
   * Generate a unique dashboard ID
   */
  private generateId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Add a section to the dashboard
   */
  addSection(section: Omit<DashboardSection, 'widgets'> & { widgets?: DashboardWidget[] }): this {
    const newSection: DashboardSection = {
      ...section,
      widgets: section.widgets || [],
    }

    this.sections.push(newSection)
    this.updatedAt = new Date()
    return this
  }

  /**
   * Remove a section by ID
   */
  removeSection(sectionId: string): this {
    this.sections = this.sections.filter((s) => s.id !== sectionId)
    this.updatedAt = new Date()
    return this
  }

  /**
   * Get a section by ID
   */
  getSection(sectionId: string): DashboardSection | undefined {
    return this.sections.find((s) => s.id === sectionId)
  }

  /**
   * Add a widget to a section
   */
  addWidget(sectionId: string, widget: DashboardWidget): this {
    const section = this.getSection(sectionId)
    if (!section) {
      throw new Error(`Section ${sectionId} not found`)
    }

    // Assign widget ID if not present
    if (!widget.id) {
      widget.id = this.generateWidgetId()
    }

    section.widgets.push(widget)
    this.updatedAt = new Date()
    return this
  }

  /**
   * Remove a widget from a section
   */
  removeWidget(sectionId: string, widgetId: string): this {
    const section = this.getSection(sectionId)
    if (!section) {
      throw new Error(`Section ${sectionId} not found`)
    }

    section.widgets = section.widgets.filter((w) => w.id !== widgetId)
    this.updatedAt = new Date()
    return this
  }

  /**
   * Generate a unique widget ID
   */
  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Update widget position and size
   */
  updateWidgetLayout(sectionId: string, widgetId: string, layout: {
    position?: { x: number; y: number }
    size?: { width: number; height: number }
  }): this {
    const section = this.getSection(sectionId)
    if (!section) {
      throw new Error(`Section ${sectionId} not found`)
    }

    const widget = section.widgets.find((w) => w.id === widgetId)
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found in section ${sectionId}`)
    }

    if (layout.position) {
      widget.position = layout.position
    }
    if (layout.size) {
      widget.size = layout.size
    }

    this.updatedAt = new Date()
    return this
  }

  /**
   * Add global filters that apply to all widgets
   */
  addFilter(filter: DashboardFilter): this {
    this.filters.push(filter)
    this.updatedAt = new Date()
    return this
  }

  /**
   * Apply size preset to a widget
   */
  applyPreset(sectionId: string, widgetId: string, preset: keyof typeof WIDGET_SIZE_PRESETS): this {
    const size = WIDGET_SIZE_PRESETS[preset]
    if (!size) {
      throw new Error(`Invalid preset: ${preset}`)
    }

    return this.updateWidgetLayout(sectionId, widgetId, { size })
  }

  /**
   * Auto-layout all widgets using the selected strategy
   */
  autoLayout(strategy?: LayoutStrategy): this {
    const layoutStrategy = strategy || this.layoutStrategy

    switch (layoutStrategy) {
      case 'flow':
        this.applyFlowLayout()
        break
      case 'grid':
        this.applyGridLayout()
        break
      case 'masonry':
        this.applyMasonryLayout()
        break
      case 'manual':
        // Manual layout - don't change positions
        break
      default:
        throw new Error(`Unknown layout strategy: ${layoutStrategy}`)
    }

    this.updatedAt = new Date()
    return this
  }

  /**
   * Flow layout: widgets flow left to right, top to bottom
   */
  private applyFlowLayout(): void {
    let currentY = 0

    for (const section of this.sections) {
      let currentX = 0
      let maxHeightInRow = 0

      for (const widget of section.widgets) {
        // Apply default size if not set
        if (!widget.size) {
          widget.size = this.getDefaultSize(widget.type)
        }

        const { width, height } = widget.size

        // Move to next row if widget doesn't fit
        if (currentX + width > this.gridConfig.columns) {
          currentX = 0
          currentY += maxHeightInRow
          maxHeightInRow = 0
        }

        // Position widget
        widget.position = { x: currentX, y: currentY }

        currentX += width
        maxHeightInRow = Math.max(maxHeightInRow, height)
      }

      // Move to next section
      currentY += maxHeightInRow
    }
  }

  /**
   * Grid layout: equal-sized widgets in a uniform grid
   */
  private applyGridLayout(): void {
    let currentY = 0

    for (const section of this.sections) {
      const widgetCount = section.widgets.length
      const widgetsPerRow = section.fullWidth ? 1 : Math.min(3, widgetCount)
      const widgetWidth = Math.floor(this.gridConfig.columns / widgetsPerRow)

      section.widgets.forEach((widget, index) => {
        const row = Math.floor(index / widgetsPerRow)
        const col = index % widgetsPerRow

        if (!widget.size) {
          widget.size = { width: widgetWidth, height: 2 }
        }

        widget.position = {
          x: col * widgetWidth,
          y: currentY + row * 2,
        }
      })

      const rows = Math.ceil(widgetCount / widgetsPerRow)
      currentY += rows * 2
    }
  }

  /**
   * Masonry layout: widgets flow with variable heights
   */
  private applyMasonryLayout(): void {
    const columns = 3
    const columnHeights = new Array(columns).fill(0)
    let sectionY = 0

    for (const section of this.sections) {
      // Reset column heights for each section
      columnHeights.fill(sectionY)

      for (const widget of section.widgets) {
        if (!widget.size) {
          widget.size = this.getDefaultSize(widget.type)
        }

        // Find shortest column
        const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights))
        const columnWidth = Math.floor(this.gridConfig.columns / columns)

        widget.position = {
          x: shortestColumn * columnWidth,
          y: columnHeights[shortestColumn],
        }

        // Update column height
        columnHeights[shortestColumn] += widget.size.height
      }

      // Move to next section
      sectionY = Math.max(...columnHeights)
    }
  }

  /**
   * Get default widget size based on type
   */
  private getDefaultSize(type: DashboardWidget['type']): WidgetSizePreset {
    switch (type) {
      case 'metric':
        return WIDGET_SIZE_PRESETS.metric
      case 'chart':
        return WIDGET_SIZE_PRESETS.chart
      case 'table':
        return WIDGET_SIZE_PRESETS.table
      case 'funnel':
        return WIDGET_SIZE_PRESETS.chart
      case 'cohort':
        return WIDGET_SIZE_PRESETS.large
      case 'insight':
        return WIDGET_SIZE_PRESETS.medium
      default:
        return WIDGET_SIZE_PRESETS.medium
    }
  }

  /**
   * Get all widgets across all sections
   */
  getAllWidgets(): DashboardWidget[] {
    return this.sections.flatMap((section) => section.widgets)
  }

  /**
   * Get dashboard grid configuration
   */
  getGridConfig(): GridConfig {
    return { ...this.gridConfig }
  }

  /**
   * Update grid configuration
   */
  updateGridConfig(config: Partial<GridConfig>): this {
    this.gridConfig = { ...this.gridConfig, ...config }
    this.updatedAt = new Date()
    return this
  }

  /**
   * Calculate total dashboard height in rows
   */
  getTotalHeight(): number {
    const widgets = this.getAllWidgets()
    if (widgets.length === 0) return 0

    return Math.max(
      ...widgets.map((w) => (w.position?.y || 0) + (w.size?.height || 1))
    )
  }

  /**
   * Get responsive layout for a specific breakpoint
   */
  getResponsiveLayout(width: number): {
    columns: number
    widgets: Array<DashboardWidget & { responsiveSize: WidgetSizePreset }>
  } {
    const { breakpoints } = this.gridConfig
    let columns = this.gridConfig.columns

    if (width < breakpoints!.mobile) {
      columns = 1
    } else if (width < breakpoints!.tablet) {
      columns = 4
    } else if (width < breakpoints!.desktop) {
      columns = 8
    }

    // Adjust widget sizes for smaller screens
    const widgets = this.getAllWidgets().map((widget) => {
      const originalWidth = widget.size?.width || 6
      const scaleFactor = columns / this.gridConfig.columns
      const responsiveWidth = Math.max(1, Math.floor(originalWidth * scaleFactor))

      return {
        ...widget,
        responsiveSize: {
          width: Math.min(responsiveWidth, columns),
          height: widget.size?.height || 2,
        },
      }
    })

    return { columns, widgets }
  }

  /**
   * Export dashboard as JSON (compatible with analytics.do API)
   */
  toJSON(): Dashboard {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      widgets: this.getAllWidgets(),
      filters: this.filters,
      shared: this.shared,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a DashboardLayout from a Dashboard object
   */
  static fromJSON(dashboard: Dashboard): DashboardLayout {
    const layout = new DashboardLayout({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      shared: dashboard.shared,
    })

    // Create a default section with all widgets
    if (dashboard.widgets && dashboard.widgets.length > 0) {
      layout.addSection({
        id: 'main',
        title: 'Main',
        widgets: dashboard.widgets,
      })
    }

    if (dashboard.filters) {
      dashboard.filters.forEach((filter) => layout.addFilter(filter))
    }

    return layout
  }

  /**
   * Clone the dashboard
   */
  clone(newName?: string): DashboardLayout {
    const cloned = new DashboardLayout({
      name: newName || `${this.name} (Copy)`,
      description: this.description,
      columns: this.gridConfig.columns,
      rowHeight: this.gridConfig.rowHeight,
      gap: this.gridConfig.gap,
      layoutStrategy: this.layoutStrategy,
      shared: false,
    })

    // Deep clone sections
    this.sections.forEach((section) => {
      cloned.addSection({
        ...section,
        widgets: section.widgets.map((w) => ({ ...w })),
      })
    })

    // Clone filters
    this.filters.forEach((filter) => cloned.addFilter({ ...filter }))

    return cloned
  }
}

/**
 * Create a new dashboard layout
 */
export function createDashboard(options: {
  name: string
  description?: string
  columns?: number
  rowHeight?: number
  layoutStrategy?: LayoutStrategy
}): DashboardLayout {
  return new DashboardLayout(options)
}

// Re-export types
export type { Dashboard, DashboardWidget, DashboardFilter } from './index'
