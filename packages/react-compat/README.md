# @dotdo/react-compat

React compatibility layer using `hono/jsx/dom` for dramatic bundle size reduction.

**2.8KB vs React's 50KB+**

## Overview

This package provides React-compatible APIs backed by Hono's JSX implementation,
enabling the use of React ecosystem libraries (TanStack Query, Zustand, Jotai, etc.)
with a fraction of the bundle size.

## Installation

```bash
pnpm add @dotdo/react-compat hono
```

## Usage

### As React Alias

Configure your bundler to alias React to this package:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      react: '@dotdo/react-compat',
      'react-dom': '@dotdo/react-compat/dom',
      'react/jsx-runtime': '@dotdo/react-compat/jsx-runtime',
      'react/jsx-dev-runtime': '@dotdo/react-compat/jsx-dev-runtime',
    },
  },
})
```

### Direct Import

```typescript
import { useState, useEffect, createContext, useContext } from '@dotdo/react-compat'
import { render } from '@dotdo/react-compat/dom'
```

## Exports

### Main (`@dotdo/react-compat`)

- **Hooks**: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useReducer`, `useId`, `useLayoutEffect`
- **Context**: `createContext`, `useContext`
- **External Stores**: `useSyncExternalStore` (critical for TanStack Query, Zustand, Jotai)
- **Components**: `memo`, `forwardRef`, `Fragment`
- **JSX**: `createElement`

### DOM (`@dotdo/react-compat/dom`)

- `render`
- `createRoot`
- `hydrateRoot`
- `createPortal`
- `flushSync`

### JSX Runtime (`@dotdo/react-compat/jsx-runtime`)

- `jsx`
- `jsxs`
- `Fragment`

### JSX Dev Runtime (`@dotdo/react-compat/jsx-dev-runtime`)

- `jsxDEV`
- `Fragment`

## Compatibility

This package is designed to be compatible with:

- TanStack Query (React Query)
- Zustand
- Jotai
- Other libraries using React's core hooks and context

## Bundle Size Comparison

| Package | Size (gzip) |
|---------|-------------|
| react + react-dom | ~50KB |
| @dotdo/react-compat | ~2.8KB |

## Development Status

This package is under active development. See the linked Beads issues for progress:

- workers-jvy7: Core hooks
- workers-harw: Context API
- workers-cmr6: useSyncExternalStore
- workers-p5py: jsx-runtime exports

## License

MIT
