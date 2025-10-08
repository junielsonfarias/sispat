import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../src/App'

// Mocking localStorage and sessionStorage
const storageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: storageMock })
Object.defineProperty(window, 'sessionStorage', { value: storageMock })

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)

describe('E2E Tests for SISPAT Application', () => {
  beforeEach(() => {
    storageMock.clear()
  })

  describe('Application Rendering', () => {
    it('should render the application without crashing', () => {
      render(<App />)
      expect(document.body).toBeTruthy()
    })

    it('should render a loader initially', () => {
      render(<App />)
      expect(document.querySelector('.animate-spin')).toBeTruthy()
    })
  })
})
