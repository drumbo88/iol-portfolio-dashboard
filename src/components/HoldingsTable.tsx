import type { PortfolioPosition } from '../types'
import { getPositionSymbol, money, pct } from '../utils/portfolio'

type HoldingsTableProps = {
  positions: PortfolioPosition[]
  onPositionDoubleClick: (position: PortfolioPosition) => void
}

export function HoldingsTable({ positions, onPositionDoubleClick }: HoldingsTableProps) {
  return <section className="panel"><h2>Tenencias</h2>
    <div className="table-wrap"><table><thead><tr>
      <th>Especie</th><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Valuación</th><th>Var. día</th><th>Rendimiento</th>
    </tr></thead><tbody>
      {positions.map((position, index) => <tr key={`${getPositionSymbol(position)}-${index}`} onDoubleClick={() => onPositionDoubleClick(position)} className="row-clickable">
        <td><b>{getPositionSymbol(position)}</b></td><td>{position.titulo?.descripcion ?? '—'}</td>
        <td>{Number(position.cantidad ?? 0).toLocaleString('es-AR')}</td>
        <td>{money.format(Number(position.ultimoPrecio ?? 0))}</td>
        <td>{money.format(Number(position.valorizado ?? 0))}</td>
        <td className={Number(position.variacionDiaria ?? 0) >= 0 ? 'positive' : 'negative'}>{pct.format(Number(position.variacionDiaria ?? 0) / 100)}</td>
        <td className={Number(position.gananciaPorcentaje ?? 0) >= 0 ? 'positive' : 'negative'}>{pct.format(Number(position.gananciaPorcentaje ?? 0) / 100)}</td>
      </tr>)}
    </tbody></table></div>
  </section>
}
