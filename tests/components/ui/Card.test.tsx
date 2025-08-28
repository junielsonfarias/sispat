import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../src/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render correctly', () => {
      render(
        <Card data-testid="card">
          <div>Card content</div>
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveTextContent('Card content')
    })

    it('should apply custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('CardHeader', () => {
    it('should render header content', () => {
      render(
        <CardHeader data-testid="card-header">
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
      )
      
      const header = screen.getByTestId('card-header')
      expect(header).toBeInTheDocument()
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })
  })

  describe('CardTitle', () => {
    it('should render title text', () => {
      render(<CardTitle>My Card Title</CardTitle>)
      
      expect(screen.getByText('My Card Title')).toBeInTheDocument()
    })

    it('should render as different HTML elements', () => {
      const { rerender } = render(<CardTitle>Title as div</CardTitle>)
      expect(screen.getByText('Title as div').tagName).toBe('H3')
      
      rerender(<CardTitle as="h1">Title as h1</CardTitle>)
      expect(screen.getByText('Title as h1').tagName).toBe('H1')
    })
  })

  describe('CardDescription', () => {
    it('should render description text', () => {
      render(<CardDescription>Card description text</CardDescription>)
      
      expect(screen.getByText('Card description text')).toBeInTheDocument()
    })
  })

  describe('CardContent', () => {
    it('should render content', () => {
      render(
        <CardContent data-testid="card-content">
          <p>This is card content</p>
        </CardContent>
      )
      
      const content = screen.getByTestId('card-content')
      expect(content).toBeInTheDocument()
      expect(screen.getByText('This is card content')).toBeInTheDocument()
    })
  })

  describe('CardFooter', () => {
    it('should render footer content', () => {
      render(
        <CardFooter data-testid="card-footer">
          <button>Action Button</button>
        </CardFooter>
      )
      
      const footer = screen.getByTestId('card-footer')
      expect(footer).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
    })
  })

  describe('Complete Card', () => {
    it('should render a complete card with all parts', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Complete Card</CardTitle>
            <CardDescription>This is a complete card example</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card body content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Save</button>
            <button>Cancel</button>
          </CardFooter>
        </Card>
      )
      
      // Check all parts are rendered
      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByText('Complete Card')).toBeInTheDocument()
      expect(screen.getByText('This is a complete card example')).toBeInTheDocument()
      expect(screen.getByText('Card body content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })
})
