import { useEffect, useMemo, useState } from 'react'
import type { PortfolioPosition } from '../types'
import { convertAmount, formatAmount, getDailyVariation, getPositionPerformance, getPositionSymbol, getRealizedPerformance, pct, type DisplayRates, type DisplayUnit } from '../utils/portfolio'
import type { Operation, PerformanceHistory, PerformanceMonth } from '../types'

type HoldingsTableProps = {
  positions: PortfolioPosition[]
  onPositionDoubleClick: (position: PortfolioPosition) => void
  displayUnit: DisplayUnit
  rates: DisplayRates
  operations: Operation[]
  market: string
}

export function HoldingsTable({ positions, onPositionDoubleClick, displayUnit, rates, operations, market }: HoldingsTableProps) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'symbol', direction: 'asc' })
  const [tableView, setTableView] = useState<'Saldos' | 'Rendimientos'>('Saldos')
  const [performanceHistories, setPerformanceHistories] = useState<PerformanceHistory[]>([])
  const totalRealizedPerformance = positions.reduce((sum, position) => sum + getRealizedPerformance(position, operations, displayUnit, rates), 0)
  const totalCurrentPerformance = positions.reduce((sum, position) => sum + getPositionPerformance(position, operations, displayUnit, rates).amount, 0)
  const sortedPositions = useMemo(() => [...positions].sort((left, right) => {
    const values = (position: PortfolioPosition) => {
      const performance = getPositionPerformance(position, operations, displayUnit, rates)
      return {
        symbol: getPositionSymbol(position), description: position.titulo?.descripcion ?? '', quantity: Number(position.cantidad ?? 0),
        price: Number(position.ultimoPrecio ?? 0), value: Number(position.valorizado ?? 0), daily: getDailyVariation(position, displayUnit, rates),
        current: performance.amount, currentPercent: performance.percent ?? Number(position.gananciaPorcentaje ?? 0) / 100,
        realized: getRealizedPerformance(position, operations, displayUnit, rates)
      }
    }
    const difference = values(left)[sort.key as keyof ReturnType<typeof values>] > values(right)[sort.key as keyof ReturnType<typeof values>] ? 1 : values(left)[sort.key as keyof ReturnType<typeof values>] < values(right)[sort.key as keyof ReturnType<typeof values>] ? -1 : 0
    return sort.direction === 'asc' ? difference : -difference
  }), [positions, operations, displayUnit, rates, sort])
  const toggleSort = (key: string) => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  const header = (label: string, key: string) => <th className="sortable-header" onClick={() => toggleSort(key)} onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && toggleSort(key)} role="button" tabIndex={0}>{label}{sort.key === key ? ` ${sort.direction === 'asc' ? ' ↑' : ' ↓'}` : ''}</th>

  useEffect(() => {
    if (tableView !== 'Rendimientos' || !positions.length) return
    const symbols = positions.map(position => position.titulo?.simbolo).filter(Boolean).join(',')
    fetch(`/api/performance-history/${market}?simbolos=${encodeURIComponent(symbols)}`)
      .then(response => response.ok ? response.json() : Promise.reject(response))
      .then(data => setPerformanceHistories(data.histories ?? []))
      .catch(() => setPerformanceHistories([]))
  }, [tableView, positions, market])

  const performanceHistory = (symbol: string) => performanceHistories.find(history => history.symbol.toUpperCase() === symbol.toUpperCase())
  const performanceCell = (history: PerformanceHistory | undefined, month: PerformanceMonth) => {
    const index = history?.months.findIndex(item => item.key === month.key) ?? -1
    const current = index >= 0 ? history?.months[index].price ?? null : null
    const unitPrice = (price: number | null, key: string) => price === null ? null : convertAmount(price, displayUnit, rates, `${key}-01`)
    const currentUnitPrice = unitPrice(current, month.key)
    const previousMonth = index > 0 ? history?.months[index - 1] : history?.reference
    const previousUnitPrice = previousMonth ? unitPrice(previousMonth.price, previousMonth.key) : null
    const variation = currentUnitPrice !== null && previousUnitPrice ? (currentUnitPrice / previousUnitPrice - 1) * 100 : null
    const cumulative = history?.months.slice(0, index + 1).filter(item => item.price !== null).reduce((first, item) => first ?? item.price, null as number | null)
    const firstMonth = history?.months.slice(0, index + 1).find(item => item.price !== null)
    const firstUnitPrice = firstMonth ? unitPrice(firstMonth.price, firstMonth.key) : null
    const cumulativePercent = currentUnitPrice !== null && firstUnitPrice ? (currentUnitPrice / firstUnitPrice - 1) * 100 : null
    return { variation, cumulativePercent, title: current && cumulative ? `Precio primer día: ${formatAmount(cumulative, 'ARS')} | Precio del mes: ${formatAmount(current, 'ARS')} | Variación acumulada: ${cumulativePercent?.toFixed(2)}%` : 'Sin precio histórico disponible' }
  }

  return <section className="panel"><div className="table-title-row">
    <div className="table-heading"><h2>Tenencias</h2><label className="table-view-select"><span className="sr-only">Vista de Tenencias</span><select value={tableView} onChange={event => setTableView(event.target.value as 'Saldos' | 'Rendimientos')}><option value="Saldos">Saldos</option><option value="Rendimientos">Rendimientos</option></select></label></div>
    <span>Rend. obtenidos: <strong className={totalRealizedPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalRealizedPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong> <em>• Rend. actuales: <strong className={totalCurrentPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalCurrentPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong></em></span></div>
    {tableView === 'Saldos' ? <div className="table-wrap"><table><thead><tr>
      {header('Especie', 'symbol')}{header('Descripción', 'description')}{header('Cantidad', 'quantity')}{header('Precio', 'price')}{header('Valuación', 'value')}{header('Var. día', 'daily')}{header('Rend. actual', 'current')}{header('Rend. actual %', 'currentPercent')}{header('Rend. obtenido', 'realized')}
    </tr></thead><tbody>
      {sortedPositions.map((position, index) => <tr key={`${getPositionSymbol(position)}-${index}`} onDoubleClick={() => onPositionDoubleClick(position)} className="row-clickable">
        <td><b>{getPositionSymbol(position)}</b></td><td>{position.titulo?.descripcion ?? '—'}</td>
        <td>{Number(position.cantidad ?? 0).toLocaleString('es-AR')}</td>
        <td>{formatAmount(Number(position.ultimoPrecio ?? 0), 'ARS')}</td>
        <td>{formatAmount(Number(position.valorizado ?? 0), 'ARS')}</td>
          {(() => {
            const dailyVariation = getDailyVariation(position, displayUnit, rates)
            const performance = getPositionPerformance(position, operations, displayUnit, rates)
            const realizedPerformance = getRealizedPerformance(position, operations, displayUnit, rates)
            return <>
          <td className={dailyVariation >= 0 ? 'positive' : 'negative'}>{pct.format(dailyVariation / 100)}</td>
          <td className={performance.amount >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(performance.amount, 'ARS', rates, undefined, displayUnit), 'ARS')}</td>
          <td className={performance.percent === null || performance.percent >= 0 ? 'positive' : 'negative'}>{pct.format(performance.percent ?? Number(position.gananciaPorcentaje ?? 0) / 100)}</td>
          <td className={realizedPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(realizedPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</td>
            </>
          })()}
      </tr>)}
    </tbody></table></div> : <PerformanceTable positions={positions} histories={performanceHistories} performanceHistory={performanceHistory} performanceCell={performanceCell} />}
  </section>
}

function PerformanceTable({ positions, histories, performanceHistory, performanceCell }: { positions: PortfolioPosition[]; histories: PerformanceHistory[]; performanceHistory: (symbol: string) => PerformanceHistory | undefined; performanceCell: (history: PerformanceHistory | undefined, month: PerformanceMonth) => { variation: number | null; cumulativePercent: number | null; title: string } }) {
  const months = histories[0]?.months ?? []
  return <div className="table-wrap"><table><thead><tr><th>Especie</th><th>Descripción</th>{months.map(month => <th key={month.key}>{month.label}</th>)}<th>12M</th></tr></thead><tbody>{positions.map((position, index) => {
    const history = performanceHistory(position.titulo?.simbolo ?? '')
    const cumulative = months.length ? performanceCell(history, months.at(-1)!).cumulativePercent : null
    return <tr key={`${position.titulo?.simbolo}-${index}`}><td><b>{position.titulo?.simbolo}</b></td><td>{position.titulo?.descripcion ?? '—'}</td>{months.map(month => { const cell = performanceCell(history, month); return <td key={month.key} title={cell.title} className={cell.variation === null ? undefined : cell.variation >= 0 ? 'positive' : 'negative'}>{cell.variation === null ? '—' : `${cell.variation.toFixed(2)}%`}</td> })}<td title={months.length ? performanceCell(history, months.at(-1)!).title : undefined}>{cumulative === null ? '—' : `${cumulative.toFixed(2)}%`}</td></tr>
  })}</tbody></table></div>
}
