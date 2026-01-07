import { describe, it, expect } from 'vitest'
import {
  detectJsxRuntime,
  detectFramework,
  resolveJsxRuntime,
  resolveFramework,
  type Dependencies,
  type JsxRuntime,
  type Framework,
} from '../src/index'

describe('detectJsxRuntime', () => {
  describe('hono runtime (no React dependencies)', () => {
    it('returns hono when only hono is present', () => {
      const deps: Dependencies = {
        hono: '^4.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('hono')
    })

    it('returns hono when hono/jsx is used without react', () => {
      const deps: Dependencies = {
        hono: '^4.0.0',
        '@hono/zod-validator': '^0.4.0',
      }
      expect(detectJsxRuntime(deps)).toBe('hono')
    })

    it('returns hono for empty dependencies', () => {
      const deps: Dependencies = {}
      expect(detectJsxRuntime(deps)).toBe('hono')
    })

    it('returns hono when only non-react packages are present', () => {
      const deps: Dependencies = {
        zod: '^3.0.0',
        drizzle: '^1.0.0',
        hono: '^4.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('hono')
    })
  })

  describe('react-compat runtime (TanStack without incompatible libs)', () => {
    it('returns react-compat when @tanstack/react-query is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@tanstack/react-query': '^5.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })

    it('returns react-compat when @tanstack/react-router is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@tanstack/react-router': '^1.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })

    it('returns react-compat when @tanstack/react-table is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@tanstack/react-table': '^8.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })

    it('returns react-compat when @tanstack/react-form is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@tanstack/react-form': '^1.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })

    it('returns react-compat with multiple TanStack packages', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@tanstack/react-query': '^5.0.0',
        '@tanstack/react-router': '^1.0.0',
        '@tanstack/react-table': '^8.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })

    it('returns react-compat for basic react without TanStack', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })
  })

  describe('react runtime (incompatible libraries require full React)', () => {
    it('returns react when framer-motion is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        'framer-motion': '^10.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })

    it('returns react when @react-three/fiber is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@react-three/fiber': '^8.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })

    it('returns react when @react-three/drei is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@react-three/drei': '^9.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })

    it('returns react when react-spring is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@react-spring/web': '^9.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })

    it('returns react when react-native-web is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        'react-native-web': '^0.19.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })

    it('returns react when use-gesture is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@use-gesture/react': '^10.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })

    it('returns react when TanStack + incompatible lib are both present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@tanstack/react-query': '^5.0.0',
        'framer-motion': '^10.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })

    it('returns react when react-aria is present', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        'react-aria': '^3.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })
  })

  describe('edge cases', () => {
    it('returns react when react is in devDependencies style (just react present)', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })

    it('handles react 19 versions', () => {
      const deps: Dependencies = {
        react: '^19.0.0',
        '@tanstack/react-query': '^5.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react-compat')
    })

    it('returns react for react-use which uses internal APIs', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        'react-use': '^17.0.0',
      }
      expect(detectJsxRuntime(deps)).toBe('react')
    })
  })
})

describe('detectFramework', () => {
  describe('TanStack Start framework', () => {
    it('returns tanstack when @tanstack/react-start is present', () => {
      const deps: Dependencies = {
        '@tanstack/react-start': '^1.0.0',
      }
      expect(detectFramework(deps)).toBe('tanstack')
    })

    it('returns tanstack when @tanstack/start is present', () => {
      const deps: Dependencies = {
        '@tanstack/start': '^1.0.0',
      }
      expect(detectFramework(deps)).toBe('tanstack')
    })

    it('returns tanstack with full TanStack setup', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        '@tanstack/react-start': '^1.0.0',
        '@tanstack/react-router': '^1.0.0',
        '@tanstack/react-query': '^5.0.0',
      }
      expect(detectFramework(deps)).toBe('tanstack')
    })
  })

  describe('React Router framework', () => {
    it('returns react-router when react-router v7 is present', () => {
      const deps: Dependencies = {
        'react-router': '^7.0.0',
      }
      expect(detectFramework(deps)).toBe('react-router')
    })

    it('returns react-router when @react-router/dev is present', () => {
      const deps: Dependencies = {
        '@react-router/dev': '^7.0.0',
      }
      expect(detectFramework(deps)).toBe('react-router')
    })

    it('returns react-router when @react-router/cloudflare is present', () => {
      const deps: Dependencies = {
        '@react-router/cloudflare': '^7.0.0',
      }
      expect(detectFramework(deps)).toBe('react-router')
    })

    it('returns unknown for react-router v6 (not framework mode)', () => {
      const deps: Dependencies = {
        'react-router-dom': '^6.0.0',
      }
      expect(detectFramework(deps)).toBe('unknown')
    })
  })

  describe('Hono framework', () => {
    it('returns hono when only hono is present', () => {
      const deps: Dependencies = {
        hono: '^4.0.0',
      }
      expect(detectFramework(deps)).toBe('hono')
    })

    it('returns hono when hono with @hono packages', () => {
      const deps: Dependencies = {
        hono: '^4.0.0',
        '@hono/zod-validator': '^0.4.0',
        '@hono/swagger-ui': '^0.4.0',
      }
      expect(detectFramework(deps)).toBe('hono')
    })
  })

  describe('Unknown framework', () => {
    it('returns unknown for empty dependencies', () => {
      const deps: Dependencies = {}
      expect(detectFramework(deps)).toBe('unknown')
    })

    it('returns unknown for non-framework packages', () => {
      const deps: Dependencies = {
        zod: '^3.0.0',
        drizzle: '^1.0.0',
      }
      expect(detectFramework(deps)).toBe('unknown')
    })

    it('returns unknown for just React without router', () => {
      const deps: Dependencies = {
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      }
      expect(detectFramework(deps)).toBe('unknown')
    })
  })

  describe('Framework precedence', () => {
    it('prefers tanstack over react-router when both present', () => {
      const deps: Dependencies = {
        '@tanstack/react-start': '^1.0.0',
        'react-router': '^7.0.0',
      }
      expect(detectFramework(deps)).toBe('tanstack')
    })

    it('prefers tanstack over hono when both present', () => {
      const deps: Dependencies = {
        '@tanstack/react-start': '^1.0.0',
        hono: '^4.0.0',
      }
      expect(detectFramework(deps)).toBe('tanstack')
    })

    it('prefers react-router over hono when both present', () => {
      const deps: Dependencies = {
        'react-router': '^7.0.0',
        hono: '^4.0.0',
      }
      expect(detectFramework(deps)).toBe('react-router')
    })
  })
})

describe('resolveJsxRuntime with config overrides', () => {
  it('uses auto-detection when no config provided', () => {
    const deps: Dependencies = {
      hono: '^4.0.0',
    }
    expect(resolveJsxRuntime(deps)).toBe('hono')
  })

  it('uses auto-detection when config is empty object', () => {
    const deps: Dependencies = {
      hono: '^4.0.0',
    }
    expect(resolveJsxRuntime(deps, {})).toBe('hono')
  })

  it('overrides to react when explicitly configured', () => {
    const deps: Dependencies = {
      hono: '^4.0.0',
    }
    expect(resolveJsxRuntime(deps, { jsxRuntime: 'react' })).toBe('react')
  })

  it('overrides to hono when explicitly configured despite react deps', () => {
    const deps: Dependencies = {
      react: '^18.0.0',
      '@tanstack/react-query': '^5.0.0',
    }
    expect(resolveJsxRuntime(deps, { jsxRuntime: 'hono' })).toBe('hono')
  })

  it('overrides to react-compat when explicitly configured', () => {
    const deps: Dependencies = {
      react: '^18.0.0',
      'framer-motion': '^10.0.0',
    }
    expect(resolveJsxRuntime(deps, { jsxRuntime: 'react-compat' })).toBe('react-compat')
  })
})

describe('resolveFramework with config overrides', () => {
  it('uses auto-detection when no config provided', () => {
    const deps: Dependencies = {
      '@tanstack/react-start': '^1.0.0',
    }
    expect(resolveFramework(deps)).toBe('tanstack')
  })

  it('uses auto-detection when config is empty object', () => {
    const deps: Dependencies = {
      '@tanstack/react-start': '^1.0.0',
    }
    expect(resolveFramework(deps, {})).toBe('tanstack')
  })

  it('overrides to react-router when explicitly configured', () => {
    const deps: Dependencies = {
      '@tanstack/react-start': '^1.0.0',
    }
    expect(resolveFramework(deps, { framework: 'react-router' })).toBe('react-router')
  })

  it('overrides to hono when explicitly configured', () => {
    const deps: Dependencies = {
      '@tanstack/react-start': '^1.0.0',
    }
    expect(resolveFramework(deps, { framework: 'hono' })).toBe('hono')
  })

  it('overrides to unknown when explicitly configured', () => {
    const deps: Dependencies = {
      '@tanstack/react-start': '^1.0.0',
    }
    expect(resolveFramework(deps, { framework: 'unknown' })).toBe('unknown')
  })
})

describe('combined detection scenarios', () => {
  it('TanStack Start with react-compat: optimized full-stack setup', () => {
    const deps: Dependencies = {
      react: '^18.0.0',
      '@tanstack/react-start': '^1.0.0',
      '@tanstack/react-router': '^1.0.0',
      '@tanstack/react-query': '^5.0.0',
      '@tanstack/react-table': '^8.0.0',
    }
    expect(detectFramework(deps)).toBe('tanstack')
    expect(detectJsxRuntime(deps)).toBe('react-compat')
  })

  it('React Router v7 with incompatible libs: full React needed', () => {
    const deps: Dependencies = {
      react: '^18.0.0',
      'react-router': '^7.0.0',
      'framer-motion': '^10.0.0',
    }
    expect(detectFramework(deps)).toBe('react-router')
    expect(detectJsxRuntime(deps)).toBe('react')
  })

  it('Pure Hono setup: smallest bundle possible', () => {
    const deps: Dependencies = {
      hono: '^4.0.0',
      '@hono/zod-validator': '^0.4.0',
      zod: '^3.0.0',
    }
    expect(detectFramework(deps)).toBe('hono')
    expect(detectJsxRuntime(deps)).toBe('hono')
  })

  it('Hono with React (hybrid): uses react-compat', () => {
    const deps: Dependencies = {
      hono: '^4.0.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    }
    // Hono is the framework, but JSX needs react-compat for React components
    expect(detectFramework(deps)).toBe('hono')
    expect(detectJsxRuntime(deps)).toBe('react-compat')
  })
})
