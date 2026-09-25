import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
describe('student proof station', () => {
  it('renders the student-first privacy boundary', () => { render(<App />); expect(screen.getByRole('heading', { name: /Prove the rule/ })).toBeInTheDocument(); expect(screen.getByText('Local only')).toBeInTheDocument() })
  it('resets session messaging when network changes', () => { render(<App />); fireEvent.change(screen.getByLabelText('Select network'), { target: { value: 'preprod' } }); expect(screen.getByText(/Wallet session reset/)).toBeInTheDocument() })
})
