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
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })
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
  const sortedOperations = [...displayedOperations].sort((left, right) => {
    const value = (operation: typeof displayedOperations[number]) => {
      const estimatedLot = estimatedLots.get(getOperationKey(operation))
      return { code: getOperationCode(operation), date: new Date(getOperationDate(operation)).getTime(), quantity: getOperationQuantity(operation), price: getOperationPrice(operation), total: getOperationTotal(operation), variation: estimatedLot?.variationAmount ?? operation.variationAmount ?? 0, percent: estimatedLot?.variationPercent ?? operation.variationPercent ?? 0 }
    }
    const leftValue = value(left)[sort.key as keyof ReturnType<typeof value>]
    const rightValue = value(right)[sort.key as keyof ReturnType<typeof value>]
    const difference = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0
    return sort.direction === 'asc' ? difference : -difference
  })
  const toggleSort = (key: string) => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  const header = (label: string, key: string) => <th className="sortable-header" onClick={() => toggleSort(key)} onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && toggleSort(key)} role="button" tabIndex={0}>{label}{sort.key === key ? ` ${sort.direction === 'asc' ? ' ↑' : ' ↓'}` : ''}</th>
  const totalOperationVariation = displayedOperations.reduce((sum, operation) => {
    const estimatedLot = estimatedLots.get(getOperationKey(operation))
    return sum + (estimatedLot?.variationAmount ?? operation.variationAmount ?? 0)
  }, 0)
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
            <div className="table-title-row"><h4>Operaciones</h4><span>Rend. obtenido: <strong className={totalOperationVariation >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(totalOperationVariation, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong></span></div>
            {loading ? <p>Cargando operaciones…</p> : sortedOperations.length ? <div className="table-wrap"><table><thead><tr>{header('Tipo', 'code')}{header('Fecha operada', 'date')}{header('Cantidad', 'quantity')}{header('Precio', 'price')}{header('Monto', 'total')}{header('Var.', 'variation')}{header('Var. %', 'percent')}</tr></thead><tbody>
              {sortedOperations.map((operation, index) => {
                const estimatedLot = estimatedLots.get(getOperationKey(operation))
                const variationAmount = estimatedLot?.variationAmount ?? operation.variationAmount
                const variationPercent = estimatedLot?.variationPercent ?? operation.variationPercent
                return <tr key={`${operation.numero ?? 'operacion'}-${index}`}>
                <td><span className="op-code">{getOperationCode(operation)}</span></td>
                <td>{formatOperationDate(getOperationDate(operation))}</td>
                <td title={operation.displayQuantityTitle}>{getDisplayedOperationQuantity(operation).toLocaleString('es-AR')}{operation.displayQuantityTitle ? '*' : ''}</td>
                <td>{formatAmountAtDate(getOperationPrice(operation), 'ARS', rates, getOperationDate(operation))}</td>
                <td>{formatAmountAtDate(getOperationTotal(operation), 'ARS', rates, getOperationDate(operation))}</td>
                <td className={variationAmount === null ? undefined : variationAmount >= 0 ? 'positive' : 'negative'}>{variationAmount === null ? '—' : formatAmount(convertAmount(variationAmount, 'ARS', rates, getOperationDate(operation), displayUnit), 'ARS')}</td>
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
                <div><span>Total venta</span><strong>{formatAmount(convertAmount(saleEstimate.totalSale, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong></div>
                <div><span>Variación</span><strong className={saleEstimate.variationAmount >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(saleEstimate.variationAmount, 'ARS', rates, undefined, displayUnit), 'ARS')}</strong></div>
                <div><span>Variación %</span><strong className={saleEstimate.variationPercent === null ? undefined : saleEstimate.variationPercent >= 0 ? 'positive' : 'negative'}>{saleEstimate.variationPercent === null ? '—' : pct.format(saleEstimate.variationPercent)}</strong></div>
              </div>
            </>}
          </div>
          <div className="stat-box"><span>Posición</span><strong>{formatAmount(Number(position.valorizado ?? 0), 'ARS')}</strong></div>
          <div className="stat-box"><span>Cotización</span><strong>{formatAmount(Number(position.ultimoPrecio ?? 0), 'ARS')}</strong></div>
          <div className="stat-box"><span>Cantidad</span><strong>{Number(position.cantidad ?? 0).toLocaleString('es-AR')}</strong></div>
          <div className="stat-box"><span>Última operación</span><strong>{formatAmount(Math.max(...assetOperations.map(getOperationPrice), 0), 'ARS')}</strong></div>
          <div className="stat-box"><span>Rendimiento</span>
            <strong className={performance.amount >= 0 ? 'positive' : 'negative'}>{formatAmount(convertAmount(performance.amount, 'ARS', rates, undefined, displayUnit), 'ARS')} ({pct.format(performance.percent ?? Number(position.gananciaPorcentaje ?? 0) / 100)})</strong>
          </div>
        </aside>
      </div>
    </div>
  </div>
}
