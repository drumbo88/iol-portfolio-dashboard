import { useMemo, useState } from 'react'
import type { Operation, PortfolioPosition } from '../types'
import { calculateOperationVariations, estimateSale, getOperationCode, getOperationDate, getOperationPrice, getOperationQuantity, getOperationTotal, money, pct } from '../utils/portfolio'

type OperationsModalProps = {
  position: PortfolioPosition
  operations: Operation[]
  loading: boolean
  market: string
  onClose: () => void
}

export function OperationsModal({ position, operations, loading, market, onClose }: OperationsModalProps) {
  const [saleQuantityInput, setSaleQuantityInput] = useState('')
  const symbol = position.titulo?.simbolo ?? ''
  const matchingOperations = operations.filter((operation) => {
    const operationSymbol = String(operation.titulo?.simbolo ?? operation.simbolo ?? '').toUpperCase()
    const normalizedSymbol = symbol.toUpperCase()
    return (operation.cantidadOperada /*&& operation.montoOperado*/)
        && (operationSymbol === normalizedSymbol || operationSymbol.replace(/\s*US\$\s*/g, '') === normalizedSymbol.replace(/\s*US\$\s*/g, ''))
  })
  const assetOperations = calculateOperationVariations(matchingOperations)
    .sort((a, b) => new Date(getOperationDate(b)).getTime() - new Date(getOperationDate(a)).getTime())
  const saleQuantity = Number(saleQuantityInput.replace(',', '.')) || 0
  const saleEstimate = useMemo(() => estimateSale(matchingOperations, saleQuantity, Number(position.ultimoPrecio ?? 0)), [matchingOperations, saleQuantity, position.ultimoPrecio])
  const getOperationKey = (operation: Operation) => String(operation.numero ?? `${getOperationDate(operation)}-${operation.simbolo ?? symbol}-${getOperationPrice(operation)}`)
  const estimatedLots = useMemo(() => new Map(saleEstimate.lots.map(lot => [getOperationKey(lot.operation), lot])), [saleEstimate.lots])
  const displayedOperations = saleQuantity > 0
    ? assetOperations.filter(operation => estimatedLots.has(getOperationKey(operation)))
    : assetOperations

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
            {loading ? <p>Cargando operaciones…</p> : displayedOperations.length ? <table className="mini-table"><thead><tr><th>Tipo</th><th>Fecha operada</th><th>Cantidad operada</th><th>Precio operado</th><th>Monto operado</th><th>Variación $</th><th>Variación %</th></tr></thead><tbody>
              {displayedOperations.map((operation, index) => {
                const estimatedLot = estimatedLots.get(getOperationKey(operation))
                const variationAmount = estimatedLot?.variationAmount ?? operation.variationAmount
                const variationPercent = estimatedLot?.variationPercent ?? operation.variationPercent
                return <tr key={`${operation.numero ?? 'operacion'}-${index}`}>
                <td><span className="op-code">{getOperationCode(operation)}</span></td>
                <td>{getOperationDate(operation)}</td>
                <td>{getOperationQuantity(operation).toLocaleString('es-AR')}</td>
                <td>{money.format(getOperationPrice(operation))}</td>
                <td>{money.format(getOperationTotal(operation))}</td>
                <td className={variationAmount === null ? undefined : variationAmount >= 0 ? 'positive' : 'negative'}>{variationAmount === null ? '—' : money.format(variationAmount)}</td>
                <td className={variationPercent === null ? undefined : variationPercent >= 0 ? 'positive' : 'negative'}>{variationPercent === null ? '—' : pct.format(variationPercent)}</td>
              </tr>
              })}
            </tbody></table> : <p className="empty-state">Sin operaciones registradas.</p>}
          </div>
        </div>

        <aside className="modal-side">
          <div className="sale-estimator">
            <h4>Estimar venta</h4>
            <label htmlFor="sale-quantity">Cantidad a vender</label>
            <input
              id="sale-quantity"
              type="text"
              inputMode="decimal"
              value={saleQuantityInput}
              onChange={event => setSaleQuantityInput(event.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="0"
            />
            {saleQuantity > saleEstimate.availableQuantity && <p className="estimator-warning">Supera la cantidad disponible.</p>}
            {saleQuantity > 0 && <>
              <div className="estimate-totals">
                <div><span>Total venta</span><strong>{money.format(saleEstimate.totalSale)}</strong></div>
                <div><span>Variación $</span><strong className={saleEstimate.variationAmount >= 0 ? 'positive' : 'negative'}>{money.format(saleEstimate.variationAmount)}</strong></div>
                <div><span>Variación %</span><strong className={saleEstimate.variationPercent === null ? undefined : saleEstimate.variationPercent >= 0 ? 'positive' : 'negative'}>{saleEstimate.variationPercent === null ? '—' : pct.format(saleEstimate.variationPercent)}</strong></div>
              </div>
            </>}
          </div>
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
