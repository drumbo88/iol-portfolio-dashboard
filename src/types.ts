export type IolTitle = {
  simbolo: string
  descripcion: string
  pais: string
  mercado: string
  tipo: string
  plazo: string
  moneda: string
}

export type PortfolioPosition = {
  cantidad: number
  comprometido: number
  puntosVariacion: number
  variacionDiaria: number
  ultimoPrecio: number
  ppc: number
  gananciaPorcentaje: number
  gananciaDinero: number
  valorizado: number
  titulo: IolTitle
  parking: null | unknown
}

export type PortfolioResponse = {
  pais: string
  activos: PortfolioPosition[]
}

export type AccountBalance = {
  liquidacion: string
  saldo: number
  comprometido: number
  disponible: number
  disponibleOperar: number
}

export type AccountEntry = {
  numero: string
  tipo: string
  moneda: string
  disponible: number
  comprometido: number
  saldo: number
  titulosValorizados: number
  total: number
  margenDescubierto: number
  saldos: AccountBalance[]
  estado: string
}

export type AccountStatistic = {
  descripcion: string
  cantidad: number
  volumen: number
}

export type AccountResponse = {
  cuentas: AccountEntry[]
  estadisticas: AccountStatistic[]
  totalEnPesos: number
}

export type Operation = {
  numero?: number | string
  fechaOrden?: string
  fechaOperada?: string
  tipo?: string
  estado?: string
  mercado?: string
  simbolo?: string
  cantidad?: number | null
  monto?: number | null
  modalidad?: string
  precio?: number | null
  cantidadOperada?: number | null
  precioOperado?: number | null
  montoOperado?: number | null
  plazo?: string
  titulo?: {
    simbolo?: string
    descripcion?: string
    pais?: string
    mercado?: string
    tipo?: string
    plazo?: string
    moneda?: string
  }
  operacion?: string
  fecha?: string
  total?: number
  moneda?: string
  [key: string]: unknown
}

export type OperationWithDisplayQuantity = Operation & {
  displayQuantity?: number
  displayQuantityTitle?: string
  displayQuantityAddition?: number
}

export type OperationsResponse = {
  operaciones?: Operation[]
  [key: string]: unknown
}

export type PerformanceMonth = {
  key: string
  label: string
  price: number | null
  variationPercent: number | null
  reference?: boolean
}

export type PerformanceHistory = {
  symbol: string
  reference?: PerformanceMonth
  months: PerformanceMonth[]
}
