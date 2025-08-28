import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { Badge } from '../../../src/components/ui/badge'

describe('Badge Component', () => {
  it('should render with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-primary')
  })

  it('should render with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>)
    
    const badge = screen.getByText('Secondary Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-secondary')
  })

  it('should render with destructive variant', () => {
    render(<Badge variant="destructive">Error Badge</Badge>)
    
    const badge = screen.getByText('Error Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-destructive')
  })

  it('should render with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>)
    
    const badge = screen.getByText('Outline Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('border')
  })

  it('should apply custom className', () => {
    render(
      <Badge className="custom-class">Custom Badge</Badge>
    )
    
    const badge = screen.getByText('Custom Badge')
    expect(badge).toHaveClass('custom-class')
  })

  it('should forward props to the underlying element', () => {
    render(
      <Badge data-testid="badge" aria-label="Test badge">
        Test Badge
      </Badge>
    )
    
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('aria-label', 'Test badge')
  })

  it('should render different content types', () => {
    render(
      <Badge>
        <span>Icon</span>
        Badge with icon
      </Badge>
    )
    
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Badge with icon')).toBeInTheDocument()
  })

  it('should handle empty content', () => {
    render(<Badge data-testid="empty-badge"></Badge>)
    
    const badge = screen.getByTestId('empty-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toBeEmptyDOMElement()
  })
})
