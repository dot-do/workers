import '@testing-library/jest-dom'
import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8787'
  process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8787'
})
