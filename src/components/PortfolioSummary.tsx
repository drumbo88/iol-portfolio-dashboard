import type { AccountResponse } from '../types'
import { formatAmount, getAccountAvailable, type DisplayRates, type DisplayUnit } from '../utils/portfolio'

type PortfolioSummaryProps = {
  total: number
  positionsCount: number
  account: AccountResponse | null
  displayUnit: DisplayUnit
  rates: DisplayRates
}

export function PortfolioSummary({ total, positionsCount, account, displayUnit, rates }: PortfolioSummaryProps) {
  return <section className="cards">
    <article><small>Valuación</small><strong>{formatAmount(total, 'ARS')}</strong></article>
    <article><small>Posiciones</small><strong>{positionsCount}</strong></article>
    <article><small>Disponible</small><strong>{formatAmount(getAccountAvailable(account), 'ARS')}</strong></article>
  </section>
}
