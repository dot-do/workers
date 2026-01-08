/**
 * Tests for analytics.do/dashboard - Dashboard Layout and Section Management
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DashboardLayout,
  createDashboard,
  WIDGET_SIZE_PRESETS,
  type DashboardSection,
  type DashboardWidget,
} from '../dashboard'

describe('analytics.do/dashboard', () => {
  describe('DashboardLayout', () => {
    let dashboard: DashboardLayout

    beforeEach(() => {
      dashboard = new DashboardLayout({
        name: 'Test Dashboard',
        description: 'A test dashboard',
        columns: 12,
        rowHeight: 80,
      })
    })

    describe('constructor', () => {
      it('should create a dashboard with default settings', () => {
        const config = dashboard.getGridConfig()
        expect(config.columns).toBe(12)
        expect(config.rowHeight).toBe(80)
        expect(config.gap).toBe(16)
      })

      it('should create a dashboard with custom grid config', () => {
        const customDashboard = new DashboardLayout({
          name: 'Custom Dashboard',
          columns: 24,
          rowHeight: 100,
          gap: 20,
        })

        const config = customDashboard.getGridConfig()
        expect(config.columns).toBe(24)
        expect(config.rowHeight).toBe(100)
        expect(config.gap).toBe(20)
      })

      it('should generate unique IDs', () => {
        const d1 = new DashboardLayout({ name: 'Dashboard 1' })
        const d2 = new DashboardLayout({ name: 'Dashboard 2' })

        const json1 = d1.toJSON()
        const json2 = d2.toJSON()

        expect(json1.id).not.toBe(json2.id)
      })

      it('should accept custom ID', () => {
        const customDashboard = new DashboardLayout({
          name: 'Custom Dashboard',
          id: 'custom_id_123',
        })

        const json = customDashboard.toJSON()
        expect(json.id).toBe('custom_id_123')
      })
    })

    describe('section management', () => {
      it('should add a section', () => {
        dashboard.addSection({
          id: 'overview',
          title: 'Overview',
          description: 'Overview section',
        })

        const section = dashboard.getSection('overview')
        expect(section).toBeDefined()
        expect(section?.title).toBe('Overview')
        expect(section?.widgets).toEqual([])
      })

      it('should add a section with widgets', () => {
        const widgets: DashboardWidget[] = [
          { type: 'metric', title: 'MRR', query: { metrics: ['mrr'] } },
          { type: 'chart', title: 'Signups', query: { metrics: ['signups'] } },
        ]

        dashboard.addSection({
          id: 'overview',
          title: 'Overview',
          widgets,
        })

        const section = dashboard.getSection('overview')
        expect(section?.widgets).toHaveLength(2)
      })

      it('should remove a section', () => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })
        dashboard.addSection({ id: 'details', title: 'Details' })

        dashboard.removeSection('overview')

        expect(dashboard.getSection('overview')).toBeUndefined()
        expect(dashboard.getSection('details')).toBeDefined()
      })

      it('should return undefined for non-existent section', () => {
        expect(dashboard.getSection('non-existent')).toBeUndefined()
      })
    })

    describe('widget management', () => {
      beforeEach(() => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })
      })

      it('should add a widget to a section', () => {
        const widget: DashboardWidget = {
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        dashboard.addWidget('overview', widget)

        const section = dashboard.getSection('overview')
        expect(section?.widgets).toHaveLength(1)
        expect(section?.widgets[0].title).toBe('MRR')
      })

      it('should auto-generate widget ID if not provided', () => {
        const widget: DashboardWidget = {
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        dashboard.addWidget('overview', widget)

        const section = dashboard.getSection('overview')
        expect(section?.widgets[0].id).toBeDefined()
        expect(section?.widgets[0].id).toMatch(/^widget_/)
      })

      it('should preserve provided widget ID', () => {
        const widget: DashboardWidget = {
          id: 'custom_widget_123',
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        dashboard.addWidget('overview', widget)

        const section = dashboard.getSection('overview')
        expect(section?.widgets[0].id).toBe('custom_widget_123')
      })

      it('should throw error when adding widget to non-existent section', () => {
        const widget: DashboardWidget = {
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        expect(() => {
          dashboard.addWidget('non-existent', widget)
        }).toThrow('Section non-existent not found')
      })

      it('should remove a widget from a section', () => {
        const widget: DashboardWidget = {
          id: 'widget_1',
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        dashboard.addWidget('overview', widget)
        dashboard.removeWidget('overview', 'widget_1')

        const section = dashboard.getSection('overview')
        expect(section?.widgets).toHaveLength(0)
      })

      it('should throw error when removing widget from non-existent section', () => {
        expect(() => {
          dashboard.removeWidget('non-existent', 'widget_1')
        }).toThrow('Section non-existent not found')
      })

      it('should update widget layout', () => {
        const widget: DashboardWidget = {
          id: 'widget_1',
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        dashboard.addWidget('overview', widget)
        dashboard.updateWidgetLayout('overview', 'widget_1', {
          position: { x: 3, y: 2 },
          size: { width: 6, height: 3 },
        })

        const section = dashboard.getSection('overview')
        const updatedWidget = section?.widgets[0]

        expect(updatedWidget?.position).toEqual({ x: 3, y: 2 })
        expect(updatedWidget?.size).toEqual({ width: 6, height: 3 })
      })

      it('should apply size preset to widget', () => {
        const widget: DashboardWidget = {
          id: 'widget_1',
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        dashboard.addWidget('overview', widget)
        dashboard.applyPreset('overview', 'widget_1', 'large')

        const section = dashboard.getSection('overview')
        const updatedWidget = section?.widgets[0]

        expect(updatedWidget?.size).toEqual(WIDGET_SIZE_PRESETS.large)
      })

      it('should throw error for invalid preset', () => {
        const widget: DashboardWidget = {
          id: 'widget_1',
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        }

        dashboard.addWidget('overview', widget)

        expect(() => {
          dashboard.applyPreset('overview', 'widget_1', 'invalid' as any)
        }).toThrow('Invalid preset: invalid')
      })
    })

    describe('layout strategies', () => {
      beforeEach(() => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })

        // Add multiple widgets
        for (let i = 0; i < 6; i++) {
          dashboard.addWidget('overview', {
            id: `widget_${i}`,
            type: 'chart',
            title: `Chart ${i}`,
            query: { metrics: ['metric'] },
          })
        }
      })

      describe('flow layout', () => {
        it('should apply flow layout', () => {
          dashboard.autoLayout('flow')

          const widgets = dashboard.getAllWidgets()
          expect(widgets[0].position).toEqual({ x: 0, y: 0 })
          expect(widgets[0].size).toBeDefined()

          // Verify widgets flow left to right
          expect(widgets[1].position?.x).toBeGreaterThanOrEqual(widgets[0].position!.x)
        })

        it('should wrap widgets to next row when they don\'t fit', () => {
          dashboard.autoLayout('flow')

          const widgets = dashboard.getAllWidgets()
          const config = dashboard.getGridConfig()

          // Find a widget that wrapped to next row
          const wrappedWidget = widgets.find((w) => w.position!.y > 0)
          expect(wrappedWidget).toBeDefined()
        })
      })

      describe('grid layout', () => {
        it('should apply grid layout with equal-sized widgets', () => {
          dashboard.autoLayout('grid')

          const widgets = dashboard.getAllWidgets()
          const firstWidgetSize = widgets[0].size

          // All widgets should have the same size
          widgets.forEach((widget) => {
            expect(widget.size).toEqual(firstWidgetSize)
            expect(widget.position).toBeDefined()
          })
        })

        it('should position widgets in rows and columns', () => {
          dashboard.autoLayout('grid')

          const widgets = dashboard.getAllWidgets()

          // Verify widgets are positioned in a grid
          const positions = widgets.map((w) => w.position)
          const uniqueXPositions = new Set(positions.map((p) => p!.x))
          const uniqueYPositions = new Set(positions.map((p) => p!.y))

          expect(uniqueXPositions.size).toBeGreaterThan(1)
          expect(uniqueYPositions.size).toBeGreaterThan(1)
        })
      })

      describe('masonry layout', () => {
        it('should apply masonry layout', () => {
          dashboard.autoLayout('masonry')

          const widgets = dashboard.getAllWidgets()

          // All widgets should be positioned
          widgets.forEach((widget) => {
            expect(widget.position).toBeDefined()
            expect(widget.size).toBeDefined()
          })
        })

        it('should distribute widgets across columns', () => {
          dashboard.autoLayout('masonry')

          const widgets = dashboard.getAllWidgets()
          const xPositions = widgets.map((w) => w.position!.x)
          const uniqueXPositions = new Set(xPositions)

          // Should use multiple columns
          expect(uniqueXPositions.size).toBeGreaterThan(1)
        })
      })

      describe('manual layout', () => {
        it('should not change positions in manual layout', () => {
          // Set custom positions
          dashboard.updateWidgetLayout('overview', 'widget_0', {
            position: { x: 5, y: 5 },
          })

          dashboard.autoLayout('manual')

          const widget = dashboard.getAllWidgets()[0]
          expect(widget.position).toEqual({ x: 5, y: 5 })
        })
      })
    })

    describe('responsive layout', () => {
      beforeEach(() => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })

        dashboard.addWidget('overview', {
          id: 'widget_1',
          type: 'chart',
          title: 'Chart',
          query: { metrics: ['metric'] },
          size: { width: 6, height: 3 },
        })

        dashboard.autoLayout('flow')
      })

      it('should adjust columns for mobile', () => {
        const layout = dashboard.getResponsiveLayout(400)
        expect(layout.columns).toBe(1)
      })

      it('should adjust columns for tablet', () => {
        const layout = dashboard.getResponsiveLayout(700)
        expect(layout.columns).toBe(4)
      })

      it('should adjust columns for desktop', () => {
        const layout = dashboard.getResponsiveLayout(900)
        expect(layout.columns).toBe(8)
      })

      it('should adjust columns for large desktop', () => {
        const layout = dashboard.getResponsiveLayout(1200)
        expect(layout.columns).toBe(12)
      })

      it('should scale widget sizes for smaller screens', () => {
        const desktopLayout = dashboard.getResponsiveLayout(1200)
        const mobileLayout = dashboard.getResponsiveLayout(400)

        const desktopWidget = desktopLayout.widgets[0]
        const mobileWidget = mobileLayout.widgets[0]

        expect(mobileWidget.responsiveSize.width).toBeLessThanOrEqual(
          desktopWidget.responsiveSize.width
        )
      })

      it('should not exceed column count in responsive layout', () => {
        const layout = dashboard.getResponsiveLayout(400)

        layout.widgets.forEach((widget) => {
          expect(widget.responsiveSize.width).toBeLessThanOrEqual(layout.columns)
        })
      })
    })

    describe('filters', () => {
      it('should add global filters', () => {
        dashboard.addFilter({
          name: 'Date Range',
          dimension: 'date',
          type: 'date-range',
          defaultValue: 'last_30_days',
        })

        const json = dashboard.toJSON()
        expect(json.filters).toHaveLength(1)
        expect(json.filters![0].name).toBe('Date Range')
      })

      it('should add multiple filters', () => {
        dashboard.addFilter({
          name: 'Date Range',
          dimension: 'date',
          type: 'date-range',
        })

        dashboard.addFilter({
          name: 'Source',
          dimension: 'source',
          type: 'multi-select',
        })

        const json = dashboard.toJSON()
        expect(json.filters).toHaveLength(2)
      })
    })

    describe('utility methods', () => {
      it('should get all widgets across sections', () => {
        dashboard.addSection({ id: 'section1', title: 'Section 1' })
        dashboard.addSection({ id: 'section2', title: 'Section 2' })

        dashboard.addWidget('section1', {
          type: 'metric',
          title: 'Widget 1',
          query: { metrics: ['m1'] },
        })

        dashboard.addWidget('section2', {
          type: 'chart',
          title: 'Widget 2',
          query: { metrics: ['m2'] },
        })

        const allWidgets = dashboard.getAllWidgets()
        expect(allWidgets).toHaveLength(2)
      })

      it('should calculate total dashboard height', () => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })

        dashboard.addWidget('overview', {
          id: 'widget_1',
          type: 'chart',
          title: 'Chart',
          query: { metrics: ['metric'] },
          position: { x: 0, y: 0 },
          size: { width: 6, height: 3 },
        })

        dashboard.addWidget('overview', {
          id: 'widget_2',
          type: 'chart',
          title: 'Chart 2',
          query: { metrics: ['metric'] },
          position: { x: 0, y: 5 },
          size: { width: 6, height: 4 },
        })

        const height = dashboard.getTotalHeight()
        expect(height).toBe(9) // y=5 + height=4
      })

      it('should return 0 height for empty dashboard', () => {
        const height = dashboard.getTotalHeight()
        expect(height).toBe(0)
      })

      it('should update grid configuration', () => {
        dashboard.updateGridConfig({ columns: 24, rowHeight: 100 })

        const config = dashboard.getGridConfig()
        expect(config.columns).toBe(24)
        expect(config.rowHeight).toBe(100)
      })
    })

    describe('serialization', () => {
      it('should export to JSON', () => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })
        dashboard.addWidget('overview', {
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        })

        const json = dashboard.toJSON()

        expect(json.name).toBe('Test Dashboard')
        expect(json.widgets).toHaveLength(1)
        expect(json.id).toBeDefined()
        expect(json.createdAt).toBeInstanceOf(Date)
        expect(json.updatedAt).toBeInstanceOf(Date)
      })

      it('should create dashboard from JSON', () => {
        const json = {
          id: 'dashboard_123',
          name: 'Imported Dashboard',
          description: 'Imported from JSON',
          widgets: [
            { type: 'metric' as const, title: 'MRR', query: { metrics: ['mrr'] } },
            { type: 'chart' as const, title: 'Signups', query: { metrics: ['signups'] } },
          ],
          filters: [],
          shared: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const imported = DashboardLayout.fromJSON(json)
        const exportedJson = imported.toJSON()

        expect(exportedJson.id).toBe('dashboard_123')
        expect(exportedJson.name).toBe('Imported Dashboard')
        expect(exportedJson.widgets).toHaveLength(2)
        expect(exportedJson.shared).toBe(true)
      })
    })

    describe('cloning', () => {
      it('should clone a dashboard', () => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })
        dashboard.addWidget('overview', {
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        })

        const cloned = dashboard.clone('Cloned Dashboard')
        const clonedJson = cloned.toJSON()

        expect(clonedJson.name).toBe('Cloned Dashboard')
        expect(clonedJson.id).not.toBe(dashboard.toJSON().id)
        expect(clonedJson.widgets).toHaveLength(1)
        expect(clonedJson.shared).toBe(false)
      })

      it('should clone with default name', () => {
        const cloned = dashboard.clone()
        const clonedJson = cloned.toJSON()

        expect(clonedJson.name).toBe('Test Dashboard (Copy)')
      })

      it('should deep clone sections and widgets', () => {
        dashboard.addSection({ id: 'overview', title: 'Overview' })
        dashboard.addWidget('overview', {
          id: 'widget_1',
          type: 'metric',
          title: 'MRR',
          query: { metrics: ['mrr'] },
        })

        const cloned = dashboard.clone()

        // Modify original
        dashboard.removeWidget('overview', 'widget_1')

        // Cloned should still have the widget
        expect(cloned.getAllWidgets()).toHaveLength(1)
      })
    })
  })

  describe('createDashboard factory', () => {
    it('should create a new dashboard', () => {
      const dashboard = createDashboard({
        name: 'Factory Dashboard',
        description: 'Created via factory',
        columns: 16,
        rowHeight: 90,
        layoutStrategy: 'grid',
      })

      const json = dashboard.toJSON()
      expect(json.name).toBe('Factory Dashboard')

      const config = dashboard.getGridConfig()
      expect(config.columns).toBe(16)
      expect(config.rowHeight).toBe(90)
    })
  })

  describe('widget size presets', () => {
    it('should have correct preset values', () => {
      expect(WIDGET_SIZE_PRESETS.small).toEqual({ width: 3, height: 1 })
      expect(WIDGET_SIZE_PRESETS.medium).toEqual({ width: 6, height: 2 })
      expect(WIDGET_SIZE_PRESETS.large).toEqual({ width: 12, height: 3 })
      expect(WIDGET_SIZE_PRESETS.metric).toEqual({ width: 3, height: 1 })
      expect(WIDGET_SIZE_PRESETS.chart).toEqual({ width: 6, height: 3 })
      expect(WIDGET_SIZE_PRESETS.table).toEqual({ width: 12, height: 4 })
    })
  })

  describe('integration: complete dashboard workflow', () => {
    it('should support full dashboard creation and layout workflow', () => {
      // Create dashboard
      const dashboard = createDashboard({
        name: 'Growth Metrics',
        description: 'Track growth and engagement',
        columns: 12,
        rowHeight: 80,
        layoutStrategy: 'flow',
      })

      // Add sections
      dashboard.addSection({
        id: 'overview',
        title: 'Overview',
        description: 'Key metrics at a glance',
      })

      dashboard.addSection({
        id: 'trends',
        title: 'Trends',
        description: 'Historical trends and patterns',
        fullWidth: true,
      })

      // Add widgets to overview
      dashboard.addWidget('overview', {
        type: 'metric',
        title: 'MRR',
        query: { metrics: ['mrr'] },
      })

      dashboard.addWidget('overview', {
        type: 'metric',
        title: 'Active Users',
        query: { metrics: ['active_users'] },
      })

      dashboard.addWidget('overview', {
        type: 'metric',
        title: 'Conversion Rate',
        query: { metrics: ['conversion_rate'] },
      })

      // Add widgets to trends
      dashboard.addWidget('trends', {
        type: 'chart',
        title: 'Signups Over Time',
        query: {
          metrics: ['signups'],
          dimensions: ['date'],
          granularity: 'day',
        },
        visualization: {
          chartType: 'line',
          showLegend: true,
        },
      })

      dashboard.addWidget('trends', {
        type: 'funnel',
        title: 'Conversion Funnel',
        query: {
          metrics: ['funnel:signup-to-purchase'],
        },
      })

      // Add global filters
      dashboard.addFilter({
        name: 'Date Range',
        dimension: 'date',
        type: 'date-range',
        defaultValue: 'last_30_days',
      })

      dashboard.addFilter({
        name: 'Source',
        dimension: 'source',
        type: 'multi-select',
      })

      // Auto-layout all widgets
      dashboard.autoLayout()

      // Verify dashboard structure
      expect(dashboard.getAllWidgets()).toHaveLength(5)
      expect(dashboard.getTotalHeight()).toBeGreaterThan(0)

      // Test responsive layouts
      const mobileLayout = dashboard.getResponsiveLayout(400)
      const desktopLayout = dashboard.getResponsiveLayout(1200)

      expect(mobileLayout.columns).toBe(1)
      expect(desktopLayout.columns).toBe(12)

      // Export to JSON
      const json = dashboard.toJSON()
      expect(json.name).toBe('Growth Metrics')
      expect(json.widgets).toHaveLength(5)
      expect(json.filters).toHaveLength(2)

      // Clone dashboard
      const cloned = dashboard.clone('Growth Metrics (Q2)')
      expect(cloned.toJSON().name).toBe('Growth Metrics (Q2)')
      expect(cloned.getAllWidgets()).toHaveLength(5)

      // Verify positions are set
      const widgets = dashboard.getAllWidgets()
      widgets.forEach((widget) => {
        expect(widget.position).toBeDefined()
        expect(widget.size).toBeDefined()
      })
    })
  })
})
