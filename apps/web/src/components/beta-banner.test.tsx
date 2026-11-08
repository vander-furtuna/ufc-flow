// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BetaBanner, betaFeedbackUrl } from './beta-banner'

afterEach(cleanup)

describe('betaFeedbackUrl', () => {
  it.each([
    ['sem variável', undefined, null],
    ['vazia', '  ', null],
    ['https', 'https://forms.gle/abc', 'https://forms.gle/abc'],
    ['http', 'http://localhost:4000/f', 'http://localhost:4000/f'],
    ['javascript não vira link', 'javascript:alert(1)', null],
    ['texto solto', 'formulário', null],
  ])('%s', (_, value, expected) => {
    expect(betaFeedbackUrl(value)).toBe(expected)
  })
})

describe('BetaBanner', () => {
  it('avisa que é beta e abre o formulário em nova aba', () => {
    render(<BetaBanner feedbackUrl="https://forms.gle/abc" />)
    expect(
      screen.getByRole('complementary', { name: 'Versão beta' }),
    ).toBeTruthy()
    const link = screen.getByRole('link', { name: /Enviar feedback/ })
    expect(link.getAttribute('href')).toBe('https://forms.gle/abc')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
