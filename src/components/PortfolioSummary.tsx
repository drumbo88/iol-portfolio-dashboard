import type { AccountResponse } from '../types'
import { convertAmount, formatAmount, getAccountAvailable, type DisplayRates, type DisplayUnit } from '../utils/portfolio'

type PortfolioSummaryProps = {
  total: number
  account: AccountResponse | null
  displayUnit: DisplayUnit
  rates: DisplayRates
  obtainedPerformance: number
  currentPerformance: number
}

export function PortfolioSummary({ total, account, displayUnit, rates, obtainedPerformance, currentPerformance }: PortfolioSummaryProps) {
  const totalPerformance = obtainedPerformance + currentPerformance
  const formatSelectedAmountInPesos = (amount: number) => formatAmount(convertAmount(amount, 'ARS', rates, undefined, displayUnit), 'ARS')

  return <section className="cards">
    <article><small>Valuación</small><strong>{formatAmount(total, 'ARS')}</strong></article>
    <article><small>Disponible</small><strong>{formatAmount(getAccountAvailable(account), 'ARS')}</strong></article>
    <article title={`Obtenidos: ${formatSelectedAmountInPesos(obtainedPerformance)} | Actuales: ${formatSelectedAmountInPesos(currentPerformance)}`}><small>Rendimiento</small><strong className={totalPerformance >= 0 ? 'positive' : 'negative'}>{formatSelectedAmountInPesos(totalPerformance)}</strong></article>
  </section>
}
