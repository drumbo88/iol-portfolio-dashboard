import { useMemo, useState } from 'react'
import type { Operation, PortfolioPosition } from '../types'
import { calculateOperationVariations, convertAmount, estimateSale, formatAmount, formatAmountAtDate, formatOperationDate, getDisplayedOperationQuantity, getOperationCode, getOperationDate, getOperationPrice, getOperationQuantity, getOperationTotal, getPositionPerformance, money, pct, type DisplayRates, type DisplayUnit } from '../utils/portfolio'

type OperationsModalProps = {
  position: PortfolioPosition
  operations: Operation[]
  loading: boolean
  market: string
  displayUnit: DisplayUnit
  rates: DisplayRates
  onClose: () => void
}

export function OperationsModal({ position, operations, loading, market, displayUnit, rates, onClose }: OperationsModalProps) {
  const [saleQuantityInput, setSaleQuantityInput] = useState('')
  const symbol = position.titulo?.simbolo ?? ''
  const matchingOperations = operations.filter((operation) => {
    const operationSymbol = String(operation.titulo?.simbolo ?? operation.simbolo ?? '').toUpperCase()
    const normalizedSymbol = symbol.toUpperCase()
    return (operation.cantidadOperada /*&& operation.montoOperado*/)
        && (operationSymbol === normalizedSymbol || operationSymbol.replace(/\s*US\$\s*/g, '') === normalizedSymbol.replace(/\s*US\$\s*/g, ''))
  })
  const assetOperations = calculateOperationVariations(matchingOperations, displayUnit, rates)
    .sort((a, b) => new Date(getOperationDate(b)).getTime() - new Date(getOperationDate(a)).getTime())
  const saleQuantity = Number(saleQuantityInput.replace(',', '.')) || 0
  const saleEstimate = useMemo(() => estimateSale(matchingOperations, saleQuantity, Number(position.ultimoPrecio ?? 0), displayUnit, rates), [matchingOperations, saleQuantity, position.ultimoPrecio, displayUnit, rates])
  const performance = getPositionPerformance(position, matchingOperations, displayUnit, rates)
  const getOperationKey = (operation: Operation) => String(operation.numero ?? `${getOperationDate(operation)}-${operation.simbolo ?? symbol}-${getOperationPrice(operation)}`)
  const estimatedLots = useMemo(() => new Map(saleEstimate.lots.map(lot => [getOperationKey(lot.operation), lot])), [saleEstimate.lots])
  const displayedOperations = saleQuantity > 0
    ? assetOperations.filter(operation => estimatedLots.has(getOperationKey(operation)))
    : assetOperations
  const altDisplayUnit: DisplayUnit = displayUnit === 'ARS' ? 'UVA' : 'ARS'

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
            {loading ? <p>Cargando operaciones…</p> : displayedOperations.length ? <div className="table-wrap"><table><thead><tr><th>Tipo</th><th>Fecha operada</th><th>Cantidad</th><th>Precio</th><th>Monto</th><th>Var.</th><th>Var. %</th></tr></thead><tbody>
              {displayedOperations.map((operation, index) => {
                const estimatedLot = estimatedLots.get(getOperationKey(operation))
                const variationAmount = estimatedLot?.variationAmount ?? operation.variationAmount
                const variationPercent = estimatedLot?.variationPercent ?? operation.variationPercent
                return <tr key={`${operation.numero ?? 'operacion'}-${index}`}>
                <td><span className="op-code">{getOperationCode(operation)}</span></td>
                <td>{formatOperationDate(getOperationDate(operation))}</td>
                <td title={operation.displayQuantityTitle}>{getDisplayedOperationQuantity(operation).toLocaleString('es-AR')}{operation.displayQuantityTitle ? '*' : ''}</td>
                <td>{formatAmountAtDate(getOperationPrice(operation), displayUnit, rates, getOperationDate(operation))}</td>
                <td>{formatAmountAtDate(getOperationTotal(operation), displayUnit, rates, getOperationDate(operation))}</td>
                <td className={variationAmount === null ? undefined : variationAmount >= 0 ? 'positive' : 'negative'}>{variationAmount === null ? '—' : formatAmount(variationAmount, displayUnit)}</td>
                <td className={variationPercent === null ? undefined : variationPercent >= 0 ? 'positive' : 'negative'}>{variationPercent === null ? '—' : pct.format(variationPercent)}</td>
              </tr>
              })}
            </tbody></table></div> : <p className="empty-state">Sin operaciones registradas.</p>}
          </div>
        </div>

        <aside className="modal-side">
          <div className="sale-estimator">
            <h4>Estimar venta</h4>
            <label htmlFor="sale-quantity">Cantidad a vender</label>
            <input
              id="sale-quantity"
              type="number"
              value={saleQuantityInput}
              onChange={event => setSaleQuantityInput(event.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="0"
            />
            {saleQuantity > saleEstimate.availableQuantity && <p className="estimator-warning">Supera la cantidad disponible.</p>}
            {saleQuantity > 0 && <>
              <div className="estimate-totals">
                <div><span>Total venta</span><strong>{formatAmount(saleEstimate.totalSale, displayUnit)}</strong></div>
                <div><span>Variación {displayUnit}</span><strong className={saleEstimate.variationAmount >= 0 ? 'positive' : 'negative'}>{formatAmount(saleEstimate.variationAmount, displayUnit)}</strong></div>
                <div><span>Variación %</span><strong className={saleEstimate.variationPercent === null ? undefined : saleEstimate.variationPercent >= 0 ? 'positive' : 'negative'}>{saleEstimate.variationPercent === null ? '—' : pct.format(saleEstimate.variationPercent)}</strong></div>
              </div>
            </>}
          </div>
          <div className="stat-box"><span>Posición</span><strong>{formatAmount(convertAmount(Number(position.valorizado ?? 0), displayUnit, rates), displayUnit)}</strong></div>
          <div className="stat-box"><span>Cotización</span><strong>{formatAmount(convertAmount(Number(position.ultimoPrecio ?? 0), displayUnit, rates), displayUnit)}</strong></div>
          <div className="stat-box"><span>Cantidad</span><strong>{Number(position.cantidad ?? 0).toLocaleString('es-AR')}</strong></div>
          <div className="stat-box"><span>Última operación</span><strong>{formatAmount(convertAmount(Math.max(...assetOperations.map(getOperationPrice), 0), displayUnit, rates), displayUnit)}</strong></div>
          <div className="stat-box"><span>Rendimiento</span>
            <strong className={performance.amount >= 0 ? 'positive' : 'negative'}>{formatAmount(performance.amount, displayUnit)} ({pct.format(performance.percent ?? Number(position.gananciaPorcentaje ?? 0) / 100)})</strong>
            <strong className={performance.percent === null || performance.percent >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(Number(performance.amount ?? 0), altDisplayUnit, rates, undefined, displayUnit), altDisplayUnit)}</strong>
          </div>
        </aside>
      </div>
    </div>
  </div>
}
