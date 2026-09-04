import { useMemo, useState } from 'react'
import type { PortfolioPosition } from '../types'
import { convertAmount, formatAmount, getDailyVariation, getPositionPerformance, getPositionSymbol, getRealizedPerformance, pct, type DisplayRates, type DisplayUnit } from '../utils/portfolio'
import type { Operation } from '../types'

type HoldingsTableProps = {
  positions: PortfolioPosition[]
  onPositionDoubleClick: (position: PortfolioPosition) => void
  displayUnit: DisplayUnit
  rates: DisplayRates
  operations: Operation[]
}

export function HoldingsTable({ positions, onPositionDoubleClick, displayUnit, rates, operations }: HoldingsTableProps) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'symbol', direction: 'asc' })
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

  return <section className="panel"><div className="table-title-row">
    <h2>Tenencias</h2>
    <span>Rend. obtenidos: <strong className={totalRealizedPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalRealizedPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong> <em>• Rend. actuales: <strong className={totalCurrentPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalCurrentPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong></em></span></div>
    <div className="table-wrap"><table><thead><tr>
      {header('Especie', 'symbol')}{header('Descripción', 'description')}{header('Cantidad', 'quantity')}{header('Precio', 'price')}{header('Valuación', 'value')}{header('Var. día', 'daily')}{header('Rend. actual', 'current')}{header('Rend. actual %', 'currentPercent')}{header('Rend. consumado', 'realized')}
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
    </tbody></table></div>
  </section>
}
