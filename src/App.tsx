import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { HoldingsTable } from './components/HoldingsTable'
import { PreviousHoldingsTable } from './components/PreviousHoldingsTable'
import { OperationsModal } from './components/OperationsModal'
import { PortfolioSummary } from './components/PortfolioSummary'
import { formatAmount, getPositionPerformance, getPreviousPositions, getRealizedPerformance, unitLabels, type DisplayRates, type DisplayUnit } from './utils/portfolio'
import type { AccountResponse, Operation, OperationsResponse, PortfolioPosition, PortfolioResponse } from './types'

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null)
  const [account, setAccount] = useState<AccountResponse | null>(null)
  const [market, setMarket] = useState('argentina')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<PortfolioPosition | null>(null)
  const [operations, setOperations] = useState<Operation[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('ARS')
  const [rates, setRates] = useState<DisplayRates>({ uva: 1, usd: 1 })
  const displayUnits: DisplayUnit[] = ['ARS', 'UVA', 'USD']

  useEffect(() => {
    fetch('/api/rates')
      .then(response => response.ok ? response.json() : Promise.reject(response))
      .then(data => setRates({ uva: Number(data.uva) || 1, usd: Number(data.usd) || 1, history: data.history ?? [] }))
      .catch(() => setError('No se pudieron obtener las cotizaciones de UVA y dólar.'))
  }, [])

  useEffect(() => {
    const handleUnitShortcut = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'u' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault()
        setDisplayUnit(current => displayUnits[(displayUnits.indexOf(current) + 1) % displayUnits.length])
      }
    }
    window.addEventListener('keydown', handleUnitShortcut)
    return () => window.removeEventListener('keydown', handleUnitShortcut)
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [portfolioResponse, accountResponse, operationsResponse] = await Promise.all([
        fetch(`/api/portfolio/${market}`).then(response => response.ok ? response.json() : Promise.reject(response)),
        fetch('/api/account').then(response => response.ok ? response.json() : Promise.reject(response)),
        fetch(`/api/operaciones?filtro.estado=terminadas&filtro.pais=${market}`).then(response => response.ok ? response.json() : Promise.reject(response))
      ])
      setPortfolio(portfolioResponse)
      setAccount(accountResponse)
      setOperations(Array.isArray(operationsResponse?.operaciones) ? operationsResponse.operaciones : Array.isArray(operationsResponse) ? operationsResponse : [])
    } catch {
      setError('No se pudo obtener la información de IOL. Verificá las credenciales y que la API esté habilitada.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [market])

  const positions = useMemo(() => portfolio?.activos ?? [], [portfolio])
  const previousPositions = useMemo(() => getPreviousPositions(operations, positions), [operations, positions])
  const obtainedPerformance = positions.reduce((sum, position) => sum + getRealizedPerformance(position, operations, displayUnit, rates), 0)
    + previousPositions.reduce((sum, position) => sum + getRealizedPerformance(position, operations, displayUnit, rates), 0)
  const currentPerformance = positions.reduce((sum, position) => sum + getPositionPerformance(position, operations, displayUnit, rates).amount, 0)
  const total = positions.reduce((sum, position) => sum + Number(position.valorizado ?? 0), 0)
  const chart = positions.slice().sort((a, b) => Number(b.valorizado ?? 0) - Number(a.valorizado ?? 0)).slice(0, 10)
    .map(position => ({ name: position.titulo?.simbolo ?? position.titulo?.descripcion ?? '?', value: Number(position.valorizado ?? 0) }))

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
        <select value={market} onChange={event => setMarket(event.target.value)}>
          <option value="argentina">Argentina</option>
          <option value="estados-unidos">Estados Unidos</option>
        </select>
        <select value={displayUnit} onChange={event => setDisplayUnit(event.target.value as DisplayUnit)} aria-label="Unidad de visualización">
          {displayUnits.map(unit => <option key={unit} value={unit}>{unitLabels[unit]}</option>)}
        </select>
        <button onClick={load}>Actualizar</button>
      </div>
    </header>

    {error && <div className="error">{error}</div>}
    {loading ? <div className="loading">Cargando portfolio…</div> : <main>
      <PortfolioSummary total={total} account={account} displayUnit={displayUnit} rates={rates} obtainedPerformance={obtainedPerformance} currentPerformance={currentPerformance} />
      <HoldingsTable positions={positions} onPositionDoubleClick={openPositionDetails} displayUnit={displayUnit} rates={rates} operations={operations} />
      <PreviousHoldingsTable positions={previousPositions} operations={operations} displayUnit={displayUnit} rates={rates} onPositionDoubleClick={openPositionDetails} />

      <section className="grid">
        <div className="panel"><h2>Composición</h2>
          <div className="chart"><ResponsiveContainer width="100%" height={300}>
            <PieChart><Pie data={chart} dataKey="value" nameKey="name" innerRadius={75} outerRadius={110}>
              {chart.map((_, index) => <Cell key={index} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer></div>
        </div>
        <div className="panel"><h2>Resumen</h2>
          <p>La información se obtiene directamente desde la API de IOL.</p>
          <p className="muted">Esta versión es de solo lectura; no puede enviar órdenes.</p>
        </div>
      </section>
    </main>}

    {selectedPosition && <OperationsModal
      position={selectedPosition}
      operations={operations}
      loading={loadingDetails}
      market={market}
      displayUnit={displayUnit}
      rates={rates}
      onClose={() => setSelectedPosition(null)}
    />}
  </div>
}
