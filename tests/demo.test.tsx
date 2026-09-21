import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoPage } from '../src/components/DemoPage'

describe('public demo', () => {
  it('lets a visitor complete a sample session and see the parent summary change', () => {
    render(<DemoPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Complete sample session' }))
    expect(screen.getByRole('status')).toHaveTextContent('Session complete')
    fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
    expect(screen.getByText('The Medicine review is complete. Keep practising to turn Amber into Green.')).toBeInTheDocument()
  })

  it('checks a practice answer and moves a sample session when availability changes', () => {
    render(<DemoPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Learn & practise' }))
    fireEvent.click(screen.getByRole('radio', { name: 'He developed vaccination against smallpox' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    fireEvent.click(screen.getByRole('button', { name: 'Weekly plan' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Available on Tuesday' }))
    expect(screen.getByRole('status')).toHaveTextContent('moves to Thursday')
  })
})
