import type { Operation, PortfolioPosition } from '../types'
import { calculateOperationVariations, getOperationCode, getOperationDate, getOperationPrice, getOperationQuantity, getOperationTotal, money, pct } from '../utils/portfolio'

type OperationsModalProps = {
  position: PortfolioPosition
  operations: Operation[]
  loading: boolean
  market: string
  onClose: () => void
}

export function OperationsModal({ position, operations, loading, market, onClose }: OperationsModalProps) {
  const symbol = position.titulo?.simbolo ?? ''
  const matchingOperations = operations.filter((operation) => {
    const operationSymbol = String(operation.titulo?.simbolo ?? operation.simbolo ?? '').toUpperCase()
    const normalizedSymbol = symbol.toUpperCase()
    return operationSymbol === normalizedSymbol || operationSymbol.replace(/\s*US\$\s*/g, '') === normalizedSymbol.replace(/\s*US\$\s*/g, '')
  })
  const assetOperations = calculateOperationVariations(matchingOperations)
    .sort((a, b) => new Date(getOperationDate(b)).getTime() - new Date(getOperationDate(a)).getTime())

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-card" onClick={event => event.stopPropagation()}>
      <div className="modal-header">
        <div>
          <h3>{symbol || 'Activo'} · {position.titulo?.descripcion ?? 'Sin descripción'}</h3>
          <small>{position.titulo?.mercado ?? market}</small>
        </div>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      <div className="modal-layout">
        <div className="modal-main">
          <div className="detail-block">
            <h4>Operaciones</h4>
            {loading ? <p>Cargando operaciones…</p> : assetOperations.length ? <table className="mini-table"><thead><tr><th>Tipo</th><th>Fecha operada</th><th>Cantidad operada</th><th>Precio operado</th><th>Monto operado</th><th>Variación $</th><th>Variación %</th></tr></thead><tbody>
              {assetOperations.map((operation, index) => <tr key={`${operation.numero ?? 'operacion'}-${index}`}>
                <td><span className="op-code">{getOperationCode(operation)}</span></td>
                <td>{getOperationDate(operation)}</td>
                <td>{getOperationQuantity(operation).toLocaleString('es-AR')}</td>
                <td>{money.format(getOperationPrice(operation))}</td>
                <td>{money.format(getOperationTotal(operation))}</td>
                <td className={operation.variationAmount === null ? undefined : operation.variationAmount >= 0 ? 'positive' : 'negative'}>{operation.variationAmount === null ? '—' : money.format(operation.variationAmount)}</td>
                <td className={operation.variationPercent === null ? undefined : operation.variationPercent >= 0 ? 'positive' : 'negative'}>{operation.variationPercent === null ? '—' : pct.format(operation.variationPercent)}</td>
              </tr>)}
            </tbody></table> : <p className="empty-state">Sin operaciones registradas.</p>}
          </div>
        </div>

        <aside className="modal-side">
          <div className="stat-box"><span>Posición</span><strong>{money.format(Number(position.valorizado ?? 0))}</strong></div>
          <div className="stat-box"><span>Cotización</span><strong>{money.format(Number(position.ultimoPrecio ?? 0))}</strong></div>
          <div className="stat-box"><span>Cantidad</span><strong>{Number(position.cantidad ?? 0).toLocaleString('es-AR')}</strong></div>
          <div className="stat-box"><span>Última operación</span><strong>{money.format(Math.max(...assetOperations.map(getOperationPrice), 0))}</strong></div>
          <div className="stat-box"><span>Ganancia</span><strong className={Number(position.gananciaDinero ?? 0) >= 0 ? 'positive' : 'negative'}>{money.format(Number(position.gananciaDinero ?? 0))}</strong></div>
          <div className="stat-box"><span>Rendimiento</span><strong className={Number(position.gananciaPorcentaje ?? 0) >= 0 ? 'positive' : 'negative'}>{pct.format(Number(position.gananciaPorcentaje ?? 0) / 100)}</strong></div>
        </aside>
      </div>
    </div>
  </div>
}
