import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../../src/components/ui/input'

describe('Input Component', () => {
  it('should render correctly', () => {
    render(<Input placeholder="Digite algo..." />)
    const input = screen.getByPlaceholderText('Digite algo...')
    expect(input).toBeInTheDocument()
  })

  it('should handle value changes', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test value' } })
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('should display error state', () => {
    render(<Input className="border-red-500" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-500')
  })
})
