import express from 'express'
import axios, { AxiosInstance } from 'axios'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const username = process.env.IOL_USERNAME?.trim() ?? ''
const password = process.env.IOL_PASSWORD?.trim() ?? ''

if (!username || !password) {
  throw new Error('Faltan IOL_USERNAME o IOL_PASSWORD en server/.env')
}

const app = express()
const port = Number(process.env.PORT ?? 3001)
const baseURL = process.env.IOL_BASE_URL ?? 'https://api.invertironline.com'

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1):5173$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

let accessToken = ''
let refreshToken = ''
let expiresAt = 0
let ratesCache: { uva: number; usd: number; history: Array<{ date: string; uva: number; usd: number }>; expiresAt: number } | null = null

app.get('/api/rates', async (_, res) => {
  try {
    if (ratesCache && ratesCache.expiresAt > Date.now()) return res.json(ratesCache)

    const [uvaResponse, usdResponse] = await Promise.all([
      axios.get('https://api.argentinadatos.com/v1/finanzas/indices/uva'),
      axios.get('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial')
    ])
    const uvaRows = Array.isArray(uvaResponse.data) ? uvaResponse.data : []
    const usdRows = Array.isArray(usdResponse.data) ? usdResponse.data : []
    const latestUva = uvaRows.at(-1)
    const latestUsd = usdRows.at(-1)
    const uva = Number(latestUva?.valor)
    const usd = Number(latestUsd?.venta)
    const sortedUsdRows = usdRows
      .map(row => ({ date: String(row.fecha), value: Number(row.venta) }))
      .filter(row => row.value > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const history = uvaRows.map(row => ({
      date: String(row.fecha),
      uva: Number(row.valor),
      usd: sortedUsdRows.filter(usdRow => new Date(usdRow.date).getTime() <= new Date(String(row.fecha)).getTime()).at(-1)?.value ?? usd
    })).filter(rate => rate.uva > 0 && rate.usd > 0)

    if (!uva || !usd || !history.length) throw new Error('Las cotizaciones recibidas no son válidas')
    ratesCache = { uva, usd, history, expiresAt: Date.now() + 1000 * 60 * 60 }
    res.json(ratesCache)
  } catch (error: any) {
    console.log(`Error fetching display rates: ${error.message}`)
    res.status(502).json({ error: 'No se pudieron obtener las cotizaciones' })
  }
})

async function authenticate() {
  console.log('Authenticating with IOL API...')
  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password
  })
  const { data } = await axios.post(`${baseURL}/token`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  accessToken = data.access_token
  refreshToken = data.refresh_token ?? ''
  expiresAt = Date.now() + Number(data.expires_in ?? 900) * 1000 - 30000
}

async function iol(): Promise<AxiosInstance> {
  if (!accessToken || Date.now() >= expiresAt) await authenticate()
  return axios.create({
    baseURL: baseURL,
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

async function get(path: string) {
  try {
    console.log(`Fetching data from ${path}...`)
    return (await (await iol()).get(path)).data
  } catch (err: any) {
    console.log(`Error fetching data from ${path}: ${err.message}`)
    if (err.response?.status === 401) {
      accessToken = ''; refreshToken = ''; await authenticate()
      return (await (await iol()).get(path)).data
    }
    throw err
  }
}

app.get('/api/health', (_, res) => {
  console.log('Health check requested')
  res.json({ ok: true })
})

app.get('/api/portfolio/:pais', async (req, res) => {
  try {
    console.log(`Fetching portfolio for ${req.params.pais}...`)
    const pais = req.params.pais
    const normalized = pais === 'estados-unidos' ? 'estados_unidos' : 'argentina'
    res.json(await get(`/api/v2/portafolio/${normalized}`))
  } catch (e: any) {
    console.log(`Error fetching portfolio for ${req.params.pais}: ${e.message}`)
    res.status(e.response?.status ?? 500).json({ error: e.response?.data ?? e.message })
  }
})

app.get('/api/account', async (_, res) => {
  console.log('Fetching account info...')
  try { res.json(await get('/api/v2/estadocuenta')) }
  catch (e: any) { 
    console.log(`Error fetching account info: ${e.message}`)
    res.status(e.response?.status ?? 500).json({ error: e.response?.data ?? e.message }) 
  }
})

app.get('/api/operaciones', async (req, res) => {
  try {
    const filtroEstado = String(req.query['filtro.estado'] ?? 'todas')
    const filtroPais = String(req.query['filtro.pais'] ?? 'argentina')
    const normalizedPais = filtroPais === 'estados-unidos' ? 'estados_unidos' : 'argentina'

    console.log(`Fetching operations for ${normalizedPais} (${filtroEstado})...`)
    const response = await (await iol()).get('/api/v2/operaciones', {
      params: {
        'filtro.fechaDesde': '2020-01-01',
        'filtro.estado': filtroEstado,
        'filtro.pais': normalizedPais
      }
    })

    res.json(response.data)
  } catch (e: any) {
    console.log(`Error fetching operations: ${e.message}`)
    res.status(e.response?.status ?? 500).json({ error: e.response?.data ?? e.message })
  }
})

app.listen(port, () => console.log(`IOL dashboard API listening on http://localhost:${port}`))
