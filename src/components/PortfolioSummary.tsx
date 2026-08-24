import type { AccountResponse } from '../types'
import { convertAmount, formatAmount, getAccountAvailable, type DisplayRates, type DisplayUnit } from '../utils/portfolio'

type PortfolioSummaryProps = {
  total: number
  positionsCount: number
  account: AccountResponse | null
  displayUnit: DisplayUnit
  rates: DisplayRates
}

export function PortfolioSummary({ total, positionsCount, account, displayUnit, rates }: PortfolioSummaryProps) {
  return <section className="cards">
    <article><small>Valuación</small><strong>{formatAmount(convertAmount(total, displayUnit, rates), displayUnit)}</strong></article>
    <article><small>Posiciones</small><strong>{positionsCount}</strong></article>
    <article><small>Disponible</small><strong>{formatAmount(convertAmount(getAccountAvailable(account), displayUnit, rates), displayUnit)}</strong></article>
  </section>
}
