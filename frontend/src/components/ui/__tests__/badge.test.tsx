import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'
import test, { describe } from 'node:test'

describe('Badge Component', () => {
  test('renders default badge', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toHaveClass('bg-zinc-900')
  })

  test('applies secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-zinc-100')
  })
})