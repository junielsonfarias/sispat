import React from 'react'
import { screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, mockFetch, mockUser } from './test-utils'
import Login from '../src/pages/auth/Login'
import BensCadastrados from '../src/pages/bens/BensCadastrados'
import BensCreate from '../src/pages/bens/BensCreate'
import BensView from '../src/pages/bens/BensView'
import PublicConsultation from '../src/pages/PublicConsultation'

describe('E2E Tests for SISPAT Application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Authentication Flow', () => {
    it('should render login page correctly', () => {
      render(<Login />)
      expect(screen.getByText(/Bem-vindo de volta/i)).toBeInTheDocument()
    })

    it('should show login form elements', () => {
      render(<Login />)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    })
  })

  describe('Asset Management (Bens Cadastrados)', () => {
    it('should render assets list page', () => {
      mockFetch({ data: [], total: 0 })
      render(<BensCadastrados />)
      expect(screen.getByText(/Bens Cadastrados/i)).toBeInTheDocument()
    })

    it('should render asset creation form', () => {
      render(<BensCreate />)
      expect(screen.getByText(/Cadastro de Bem/i)).toBeInTheDocument()
    })

    it('should render asset view page', () => {
      mockFetch({ 
        id: 'p001',
        numero_patrimonio: '2024001',
        descricao: 'Test Asset',
        categoria: 'Test Category'
      })
      render(<BensView />, { initialEntries: ['/bens-cadastrados/ver/p001'] })
      expect(screen.getByText(/Detalhes do Bem/i)).toBeInTheDocument()
    })
  })

  describe('Public Consultation', () => {
    it('should render public consultation page', () => {
      mockFetch({ data: [], total: 0 })
      render(<PublicConsultation />)
      expect(screen.getByText(/Consulta Pública de Patrimônio/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should render asset creation form without errors', () => {
      render(<BensCreate />)
      expect(screen.getByText(/Cadastro de Bem/i)).toBeInTheDocument()
    })
  })
})
