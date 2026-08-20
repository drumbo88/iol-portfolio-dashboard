import type { AccountResponse } from '../types'
import { getAccountAvailable, money } from '../utils/portfolio'

type PortfolioSummaryProps = {
  total: number
  positionsCount: number
  account: AccountResponse | null
}

export function PortfolioSummary({ total, positionsCount, account }: PortfolioSummaryProps) {
  return <section className="cards">
    <article><small>Valuación</small><strong>{money.format(total)}</strong></article>
    <article><small>Posiciones</small><strong>{positionsCount}</strong></article>
    <article><small>Disponible</small><strong>{money.format(getAccountAvailable(account))}</strong></article>
  </section>
}
