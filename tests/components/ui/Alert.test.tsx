import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { Alert, AlertDescription, AlertTitle } from '../../../src/components/ui/alert'
import { AlertCircle, CheckCircle } from 'lucide-react'

describe('Alert Components', () => {
  describe('Alert', () => {
    it('should render with default variant', () => {
      render(
        <Alert data-testid="alert">
          <AlertTitle>Default Alert</AlertTitle>
          <AlertDescription>This is a default alert</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByTestId('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveAttribute('role', 'alert')
      expect(screen.getByText('Default Alert')).toBeInTheDocument()
      expect(screen.getByText('This is a default alert')).toBeInTheDocument()
    })

    it('should render with destructive variant', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          <AlertTitle>Error Alert</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByTestId('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveClass('border-destructive/50')
    })

    it('should apply custom className', () => {
      render(
        <Alert className="custom-alert" data-testid="alert">
          <AlertTitle>Custom Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByTestId('alert')
      expect(alert).toHaveClass('custom-alert')
    })
  })

  describe('AlertTitle', () => {
    it('should render title text', () => {
      render(<AlertTitle>Alert Title</AlertTitle>)
      
      const title = screen.getByText('Alert Title')
      expect(title).toBeInTheDocument()
    })

    it('should apply correct styling', () => {
      render(<AlertTitle data-testid="alert-title">Title</AlertTitle>)
      
      const title = screen.getByTestId('alert-title')
      expect(title).toHaveClass('mb-1')
      expect(title).toHaveClass('font-medium')
    })
  })

  describe('AlertDescription', () => {
    it('should render description text', () => {
      render(<AlertDescription>Alert description text</AlertDescription>)
      
      expect(screen.getByText('Alert description text')).toBeInTheDocument()
    })

    it('should apply correct styling', () => {
      render(
        <AlertDescription data-testid="alert-description">
          Description
        </AlertDescription>
      )
      
      const description = screen.getByTestId('alert-description')
      expect(description).toHaveClass('text-sm')
    })
  })

  describe('Alert with Icons', () => {
    it('should render with icon', () => {
      render(
        <Alert data-testid="alert-with-icon">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>Please check your input</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByTestId('alert-with-icon')
      expect(alert).toBeInTheDocument()
      expect(screen.getByText('Warning')).toBeInTheDocument()
      expect(screen.getByText('Please check your input')).toBeInTheDocument()
    })

    it('should render success alert with check icon', () => {
      render(
        <Alert variant="default" data-testid="success-alert">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Operation completed successfully</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByTestId('success-alert')
      expect(alert).toBeInTheDocument()
      expect(screen.getByText('Success')).toBeInTheDocument()
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument()
    })
  })

  describe('Complex Alert', () => {
    it('should render alert with multiple elements', () => {
      render(
        <Alert data-testid="complex-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Complex Alert</AlertTitle>
          <AlertDescription>
            This alert contains multiple elements including{' '}
            <strong>bold text</strong> and{' '}
            <a href="#" className="underline">
              links
            </a>
            .
          </AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByTestId('complex-alert')
      expect(alert).toBeInTheDocument()
      expect(screen.getByText('Complex Alert')).toBeInTheDocument()
      expect(screen.getByText('bold text')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'links' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Alert data-testid="accessible-alert">
          <AlertTitle>Accessible Alert</AlertTitle>
          <AlertDescription>This alert is accessible</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByTestId('accessible-alert')
      expect(alert).toHaveAttribute('role', 'alert')
    })

    it('should be focusable when needed', () => {
      render(
        <Alert tabIndex={0} data-testid="focusable-alert">
          <AlertTitle>Focusable Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByTestId('focusable-alert')
      expect(alert).toHaveAttribute('tabIndex', '0')
    })
  })
})
