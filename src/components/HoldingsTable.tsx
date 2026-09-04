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
  const totalRealizedPerformance = positions.reduce((sum, position) => sum + getRealizedPerformance(position, operations, displayUnit, rates), 0)
  const totalCurrentPerformance = positions.reduce((sum, position) => sum + getPositionPerformance(position, operations, displayUnit, rates).amount, 0)

  return <section className="panel"><div className="table-title-row">
    <h2>Tenencias</h2>
    <span>Rend. obtenidos: <strong className={totalRealizedPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalRealizedPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong> <em>• Rend. actuales: <strong className={totalCurrentPerformance >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalCurrentPerformance, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong></em></span></div>
    <div className="table-wrap"><table><thead><tr>
      <th>Especie</th><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Valuación</th><th>Var. día</th><th>Rend. actual</th><th>Rend. actual %</th><th>Rend. consumado</th>
    </tr></thead><tbody>
      {positions.map((position, index) => <tr key={`${getPositionSymbol(position)}-${index}`} onDoubleClick={() => onPositionDoubleClick(position)} className="row-clickable">
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
