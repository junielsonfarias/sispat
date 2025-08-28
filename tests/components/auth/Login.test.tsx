import React from 'react'
import { render, screen, fireEvent, waitFor } from '../../test-utils'
import { describe, it, expect, vi } from 'vitest'
import Login from '../../../src/pages/auth/Login'
import { mockFetch } from '../../test-utils'

describe('Login Component', () => {
  it('should render login form', () => {
    render(<Login />)
    
    expect(screen.getByText(/Bem-vindo de volta/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    render(<Login />)
    
    const submitButton = screen.getByRole('button', { name: /entrar/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument()
    })
  })

  it('should handle successful login', async () => {
    mockFetch({ 
      success: true, 
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin' },
      token: 'fake-token'
    })
    
    render(<Login />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/senha/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: 'test@test.com',
            password: 'password123',
          }),
        })
      )
    })
  })

  it('should show error message for invalid credentials', async () => {
    mockFetch({ success: false, error: 'Credenciais inválidas' }, 401)
    
    render(<Login />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/senha/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })
    
    fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument()
    })
  })
})
