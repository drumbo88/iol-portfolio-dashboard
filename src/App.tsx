import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { AccountEntry, AccountResponse, Operation, OperationsResponse, PortfolioPosition, PortfolioResponse } from './types'

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const pct = new Intl.NumberFormat('es-AR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const getAccountAvailable = (account: AccountResponse | null) => {
  const firstAccount = account?.cuentas?.[0] as AccountEntry | undefined
  return firstAccount?.disponible ?? 0
}

const normalizeOperationType = (op: Operation) => String(op.tipo ?? op.operacion ?? '').toLowerCase()

const getOperationDate = (op: Operation) => String(op.fechaOperada ?? op.fechaOrden ?? op.fecha ?? '—')
const getOperationQuantity = (op: Operation) => Number(op.cantidadOperada ?? op.cantidad ?? 0)
const getOperationPrice = (op: Operation) => Number(op.precioOperado ?? op.precio ?? 0)
const getOperationTotal = (op: Operation) => Number(op.montoOperado ?? op.monto ?? (getOperationPrice(op) * getOperationQuantity(op)) ?? 0)

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null)
  const [account, setAccount] = useState<AccountResponse | null>(null)
  const [market, setMarket] = useState('argentina')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<PortfolioPosition | null>(null)
  const [operations, setOperations] = useState<Operation[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const [p, a] = await Promise.all([
        fetch(`/api/portfolio/${market}`).then(r => r.ok ? r.json() : Promise.reject(r)),
        fetch('/api/account').then(r => r.ok ? r.json() : Promise.reject(r))
      ])
      setPortfolio(p); setAccount(a)
    } catch (e) {
      setError('No se pudo obtener la información de IOL. Verificá las credenciales y que la API esté habilitada.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [market])

  const positions = useMemo<PortfolioPosition[]>(() => portfolio?.activos ?? [], [portfolio])

  const total = positions.reduce((sum, p) => sum + Number(p.valorizado ?? 0), 0)
  const chart = positions.slice().sort((a, b) => Number(b.valorizado ?? 0) - Number(a.valorizado ?? 0)).slice(0, 10)
    .map(p => ({ name: p.titulo?.simbolo ?? p.titulo?.descripcion ?? '?', value: Number(p.valorizado ?? 0) }))

  const selectedSymbol = selectedPosition?.titulo?.simbolo ?? ''
  const assetOperations = useMemo(() => {
    if (!selectedSymbol) return []
    const symbol = selectedSymbol.toUpperCase()
    return operations.filter((op) => {
      const opSymbol = String(op.titulo?.simbolo ?? op.simbolo ?? '').toUpperCase()
      return opSymbol === symbol || opSymbol.replace(/\s*US\$\s*/g, '') === symbol.replace(/\s*US\$\s*/g, '')
    })
  }, [selectedSymbol, operations])

  const operationsByType = useMemo(() => {
    return [...assetOperations].sort((a, b) => new Date(getOperationDate(b)).getTime() - new Date(getOperationDate(a)).getTime())
  }, [assetOperations])

  const getOperationCode = (op: Operation) => {
    const tipoRaw = String(op.tipo ?? op.operacion ?? '').toLowerCase()
    const plazoRaw = String(op.plazo ?? '').toLowerCase()

    // Dividendo / Pago de Dividendos
    if (tipoRaw.includes('pago de dividend') || tipoRaw.includes('dividend') || tipoRaw.includes('dividendo')) return 'D'

    // Suscripción FCI
    if (tipoRaw.includes('suscrip') || tipoRaw.includes('suscripción')) return 'S'

    // Rescate FCI
    if (tipoRaw.includes('rescat') || tipoRaw.includes('rescate')) return 'R'

    // Compra
    if (tipoRaw.includes('compra') || tipoRaw.includes('buy')) {
      if (plazoRaw.includes('inmedi') || plazoRaw.includes('contado')) return 'CI'
      return 'C'
    }

    // Venta
    if (tipoRaw.includes('venta') || tipoRaw.includes('sell')) {
      if (plazoRaw.includes('inmedi') || plazoRaw.includes('contado')) return 'VI'
      return 'V'
    }

    // Fallback heuristics
    if (/compra|buy/i.test(tipoRaw)) return 'C'
    if (/venta|sell/i.test(tipoRaw)) return 'V'
    if (/dividend|interes|pago/i.test(tipoRaw)) return 'D'
    if (/suscrip|subscr|subscription/i.test(tipoRaw)) return 'S'
    if (/rescat|redeem/i.test(tipoRaw)) return 'R'
    if (/contado|inmediato|cash/i.test(plazoRaw)) return 'CI'
    return 'O'
  }

  const getOperationKindLabel = (op: Operation) => {
    const code = getOperationCode(op)
    if (code === 'CI') return 'Compra contado inmediato'
    if (code === 'VI') return 'Venta inmediato'
    if (code === 'C') return 'Compra'
    if (code === 'V') return 'Venta'
    if (code === 'D') return 'Dividendo'
    if (code === 'S') return 'Suscripción'
    if (code === 'R') return 'Rescate'
    return normalizeOperationType(op)
  }

  async function openPositionDetails(position: PortfolioPosition) {
    setSelectedPosition(position)
    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/operaciones?filtro.estado=terminadas&filtro.pais=${market}`)
      if (!response.ok) throw new Error('No se pudo cargar operaciones')
      const data: OperationsResponse = await response.json()
      const rows = Array.isArray(data?.operaciones) ? data.operaciones : Array.isArray(data) ? data as Operation[] : []
      setOperations(rows)
    } catch {
      setOperations([])
    } finally {
      setLoadingDetails(false)
    }
  }

  return <div className="app">
    <header><div><h1>IOL Portfolio</h1><span>Dashboard personal</span></div>
      <div className="actions">
        <select value={market} onChange={e => setMarket(e.target.value)}>
          <option value="argentina">Argentina</option>
          <option value="estados-unidos">Estados Unidos</option>
        </select>
        <button onClick={load}>Actualizar</button>
      </div>
    </header>

    {error && <div className="error">{error}</div>}
    {loading ? <div className="loading">Cargando portfolio…</div> :
    <main>
      <section className="cards">
        <article><small>Valuación</small><strong>{money.format(total)}</strong></article>
        <article><small>Posiciones</small><strong>{positions.length}</strong></article>
        <article><small>Disponible</small><strong>{money.format(getAccountAvailable(account))}</strong></article>
      </section>

      <section className="panel"><h2>Tenencias</h2>
        <div className="table-wrap"><table><thead><tr>
          <th>Especie</th><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Valuación</th><th>Var. día</th><th>Rendimiento</th>
        </tr></thead><tbody>
        {positions.map((p,i) => <tr key={`${p.titulo?.simbolo ?? 'activo'}-${i}`} onDoubleClick={() => openPositionDetails(p)} className="row-clickable">
          <td><b>{p.titulo?.simbolo ?? '—'}</b></td><td>{p.titulo?.descripcion ?? '—'}</td>
          <td>{Number(p.cantidad ?? 0).toLocaleString('es-AR')}</td>
          <td>{money.format(Number(p.ultimoPrecio ?? 0))}</td>
          <td>{money.format(Number(p.valorizado ?? 0))}</td>
          <td className={Number(p.variacionDiaria ?? 0) >= 0 ? 'positive':'negative'}>{pct.format(Number(p.variacionDiaria ?? 0)/100)}</td>
          <td className={Number(p.gananciaPorcentaje ?? 0) >= 0 ? 'positive':'negative'}>{pct.format(Number(p.gananciaPorcentaje ?? 0)/100)}</td>
        </tr>)}
        </tbody></table></div>
      </section>

      <section className="grid">
        <div className="panel"><h2>Composición</h2>
          <div className="chart"><ResponsiveContainer width="100%" height={300}>
            <PieChart><Pie data={chart} dataKey="value" nameKey="name" innerRadius={75} outerRadius={110}>
              {chart.map((_, i) => <Cell key={i} />)}
            </Pie><Tooltip formatter={(v: number) => money.format(v)} /></PieChart>
          </ResponsiveContainer></div>
        </div>
        <div className="panel"><h2>Resumen</h2>
          <p>La información se obtiene directamente desde la API de IOL.</p>
          <p className="muted">Esta versión es de solo lectura; no puede enviar órdenes.</p>
        </div>
      </section>
    </main>}

    {selectedPosition && <div className="modal-backdrop" onClick={() => setSelectedPosition(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{selectedPosition.titulo?.simbolo ?? 'Activo'} · {selectedPosition.titulo?.descripcion ?? 'Sin descripción'}</h3>
            <small>{selectedPosition.titulo?.mercado ?? market}</small>
          </div>
          <button onClick={() => setSelectedPosition(null)} className="close-button">×</button>
        </div>

        <div className="modal-layout">
          <div className="modal-main">
            <div className="detail-block">
              <h4>Operaciones</h4>
              {loadingDetails ? <p>Cargando operaciones…</p> : operationsByType.length ? <table className="mini-table"><thead><tr><th>Tipo</th><th>Fecha</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>{operationsByType.map((op, idx) => (
                <tr key={`op-${idx}`}>
                  <td><span className="op-code">{getOperationCode(op)}</span></td>
                  <td>{getOperationDate(op)}</td>
                  <td>{getOperationQuantity(op).toLocaleString('es-AR')}</td>
                  <td>{money.format(getOperationPrice(op))}</td>
                  <td>{money.format(getOperationTotal(op))}</td>
                </tr>
              ))}</tbody></table> : <p className="empty-state">Sin operaciones registradas.</p>}
            </div>
          </div>

          <aside className="modal-side">
            <div className="stat-box"><span>Posición</span><strong>{money.format(Number(selectedPosition.valorizado ?? 0))}</strong></div>
            <div className="stat-box"><span>Cotización</span><strong>{money.format(Number(selectedPosition.ultimoPrecio ?? 0))}</strong></div>
            <div className="stat-box"><span>Cantidad</span><strong>{Number(selectedPosition.cantidad ?? 0).toLocaleString('es-AR')}</strong></div>
            <div className="stat-box"><span>Última compra</span><strong>{money.format(Math.max(...assetOperations.map((op) => getOperationPrice(op)), 0))}</strong></div>
            <div className="stat-box"><span>Ganancia</span><strong className={Number(selectedPosition.gananciaDinero ?? 0) >= 0 ? 'positive' : 'negative'}>{money.format(Number(selectedPosition.gananciaDinero ?? 0))}</strong></div>
            <div className="stat-box"><span>Rendimiento</span><strong className={Number(selectedPosition.gananciaPorcentaje ?? 0) >= 0 ? 'positive' : 'negative'}>{pct.format(Number(selectedPosition.gananciaPorcentaje ?? 0)/100)}</strong></div>
          </aside>
        </div>
      </div>
    </div>}
  </div>
}
