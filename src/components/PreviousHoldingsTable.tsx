import type { Operation, PortfolioPosition } from '../types'
import { convertAmount, formatAmount, formatAmountAtDate, getOperationDate, getOperationPrice, getRealizedPerformance, getPositionSymbol, type DisplayRates, type DisplayUnit } from '../utils/portfolio'

type PreviousHoldingsTableProps = {
  positions: PortfolioPosition[]
  operations: Operation[]
  displayUnit: DisplayUnit
  rates: DisplayRates
  onPositionDoubleClick: (position: PortfolioPosition) => void
}

export function PreviousHoldingsTable({ positions, operations, displayUnit, rates, onPositionDoubleClick }: PreviousHoldingsTableProps) {
  if (!positions.length) return null
  const totalRealizedPerformance = positions.reduce((sum, position) => sum + getRealizedPerformance(position, operations, displayUnit, rates), 0)

  return <section className="panel previous-holdings"><div className="table-title-row"><h2>Tenencias anteriores</h2><span>Rend. obtenidos: <strong className={totalRealizedPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalRealizedPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong></span></div>
    <div className="table-wrap"><table><thead><tr>
      <th>Especie</th><th>Descripción</th><th>Precio</th><th>Var. día</th><th>Rend. obtenido</th>
    </tr></thead><tbody>
      {positions.map((position, index) => {
        const symbol = getPositionSymbol(position).toUpperCase()
        const lastPricedOperation = operations
          .filter(operation => String(operation.titulo?.simbolo ?? operation.simbolo ?? '').toUpperCase() === symbol && getOperationPrice(operation) > 0)
          .sort((a, b) => new Date(getOperationDate(b)).getTime() - new Date(getOperationDate(a)).getTime())[0]
        const realizedPerformance = getRealizedPerformance(position, operations, displayUnit, rates)
        return <tr key={`${getPositionSymbol(position)}-${index}`} onDoubleClick={() => onPositionDoubleClick(position)} className="row-clickable">
          <td><b>{getPositionSymbol(position)}</b></td>
          <td>{position.titulo?.descripcion ?? '—'}</td>
          <td>{lastPricedOperation ? formatAmountAtDate(getOperationPrice(lastPricedOperation), 'ARS', rates, getOperationDate(lastPricedOperation)) : '—'}</td>
          <td title="No disponible para una tenencia cerrada.">—</td>
          <td className={realizedPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(realizedPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</td>
        </tr>
      })}
    </tbody></table></div>
  </section>
}