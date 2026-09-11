import type { AccountEntry, AccountResponse, Operation, OperationWithDisplayQuantity, PortfolioPosition } from '../types'

export type DisplayUnit = 'ARS' | 'UVA' | 'USD'

export type DisplayRates = {
  uva: number
  usd: number
  history?: Array<{ date: string; uva: number; usd: number }>
}

export const unitLabels: Record<DisplayUnit, string> = {
  ARS: 'Pesos ($)',
  UVA: 'UVA',
  USD: 'Dólares (USD)'
}

export const getRateForDate = (date: string, unit: DisplayUnit, rates: DisplayRates) => {
  if (unit === 'ARS') return 1
  const target = new Date(date).getTime()
  const historical = rates.history?.filter(rate => new Date(rate.date).getTime() <= target).at(-1)
  return unit === 'UVA' ? historical?.uva ?? rates.uva : historical?.usd ?? rates.usd
}

export const convertAmount = (amount: number, unit: DisplayUnit, rates: DisplayRates, date?: string, unitFrom: DisplayUnit = 'ARS') => {
  const sourceRate = date ? getRateForDate(date, unitFrom, rates) : unitFrom === 'UVA' ? rates.uva : unitFrom === 'USD' ? rates.usd : 1
  const targetRate = date ? getRateForDate(date, unit, rates) : unit === 'UVA' ? rates.uva : unit === 'USD' ? rates.usd : 1
  const amountInArs = unitFrom === 'ARS' ? amount : amount * sourceRate
  return unit === 'ARS' ? amountInArs : targetRate ? amountInArs / targetRate : amountInArs
}

export const formatAmount = (amount: number, unit: DisplayUnit) => {
  const maximumFractionDigits = Math.abs(amount) >= 100 ? 0 : 2
  if (unit === 'UVA') return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits }).format(amount)} UVA`
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: unit, maximumFractionDigits }).format(amount)
}

export const formatAmountAtDate = (amount: number, unit: DisplayUnit, rates: DisplayRates, date: string, unitFrom: DisplayUnit = 'ARS') =>
  formatAmount(convertAmount(amount, unit, rates, date, unitFrom), unit)

export const convertPercentageForDateChange = (currentAmount: number, variationPercent: number, unit: DisplayUnit, rates: DisplayRates, previousDate: string) => {
  if (unit === 'ARS') return variationPercent
  const previousAmount = currentAmount / (1 + variationPercent / 100)
  const currentUnitAmount = convertAmount(currentAmount, unit, rates)
  const previousUnitAmount = convertAmount(previousAmount, unit, rates, previousDate)
  return previousUnitAmount ? (currentUnitAmount / previousUnitAmount - 1) * 100 : variationPercent
}

export const getPositionPerformance = (position: PortfolioPosition, operations: Operation[], unit: DisplayUnit, rates: DisplayRates) => {
  const symbol = String(position.titulo?.simbolo ?? '').toUpperCase()
  const matchingOperations = operations.filter(operation => {
    const operationSymbol = String(operation.titulo?.simbolo ?? operation.simbolo ?? '').toUpperCase()
    return operationSymbol === symbol || operationSymbol.replace(/\s*US\$\s*/g, '') === symbol.replace(/\s*US\$\s*/g, '')
  })
  const sale = estimateSale(
    matchingOperations,
    Number(position.cantidad ?? 0),
    Number(position.ultimoPrecio ?? 0),
    unit,
    rates
  )
  return { amount: sale.variationAmount, percent: sale.variationPercent }
}

export const getRealizedPerformance = (position: PortfolioPosition, operations: Operation[], unit: DisplayUnit, rates: DisplayRates) => {
  const symbol = String(position.titulo?.simbolo ?? '').toUpperCase()
  const matchingOperations = operations.filter(operation => {
    const operationSymbol = String(operation.titulo?.simbolo ?? operation.simbolo ?? '').toUpperCase()
    return operationSymbol === symbol || operationSymbol.replace(/\s*US\$\s*/g, '') === symbol.replace(/\s*US\$\s*/g, '')
  })
  const calculatedOperations = calculateOperationVariations(matchingOperations, unit, rates)
  const amount = calculatedOperations
    .filter(operation => operation.variationAmount !== null && ['V', 'VI'].includes(getOperationCode(operation)))
    .reduce((sum, operation) => sum + (operation.variationAmount ?? 0), 0)
  return amount
}

export const getDailyVariation = (position: PortfolioPosition, unit: DisplayUnit, rates: DisplayRates) => {
  const variation = Number(position.variacionDiaria ?? 0)
  if (unit === 'ARS' || !variation) return variation
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return convertPercentageForDateChange(Number(position.ultimoPrecio ?? 0), variation, unit, rates, date.toISOString())
}

export const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const pct = new Intl.NumberFormat('es-AR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const getAccountAvailable = (account: AccountResponse | null) => {
  const firstAccount = account?.cuentas?.[0] as AccountEntry | undefined
  return firstAccount?.disponible ?? 0
}

export const getOperationDate = (operation: Operation) => String(operation.fechaOperada ?? operation.fechaOrden ?? operation.fecha ?? '—')
export const formatOperationDate = (date: string) => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  const parsedDate = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(date)
  if (!date || date === '—' || Number.isNaN(parsedDate.getTime())) return date || '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).format(parsedDate)
}
export const getOperationQuantity = (operation: Operation) => Number(operation.cantidadOperada ?? operation.cantidad ?? 0)
export const isSplitOperation = (operation: Operation) => getOperationCode(operation) === 'SP'
export const getDisplayedOperationQuantity = (operation: Operation) => Number((operation as OperationWithDisplayQuantity).displayQuantity ?? getOperationQuantity(operation))
export const getOperationPrice = (operation: Operation) => Number(operation.precioOperado ?? operation.precio ?? 0)
export const getOperationTotal = (operation: Operation) => Number(operation.montoOperado ?? operation.monto ?? getOperationPrice(operation) * getOperationQuantity(operation))

export const getOperationCode = (operation: Operation) => {
  const type = String(operation.tipo ?? operation.operacion ?? '').toLowerCase()
  const term = String(operation.plazo ?? '').toLowerCase()

  if (operation.cantidadOperada != null && operation.precioOperado == null && operation.montoOperado == null && getOperationQuantity(operation) > 0) return 'SP'
  if (type.includes('dividend') || type.includes('dividendo') || type.includes('pago de dividend')) return 'D'
  if (type.includes('suscrip')) return 'S'
  if (type.includes('rescat')) return 'R'
  if (type.includes('compra') || type.includes('buy')) return term.includes('inmedi') || term.includes('contado') ? 'CI' : 'C'
  if (type.includes('venta') || type.includes('sell')) return term.includes('inmedi') || term.includes('contado') ? 'VI' : 'V'
  return 'O'
}

export const getOperationKindLabel = (operation: Operation) => {
  const labels: Record<string, string> = {
    CI: 'Compra contado inmediato',
    VI: 'Venta contado inmediato',
    C: 'Compra',
    V: 'Venta',
    D: 'Dividendo',
    S: 'Suscripción',
    R: 'Rescate',
    SP: 'Split',
    O: 'Otra operación'
  }
  return labels[getOperationCode(operation)]
}

export const getPositionSymbol = (position: PortfolioPosition) => position.titulo?.simbolo ?? '—'

export const getPreviousPositions = (operations: Operation[], currentPositions: PortfolioPosition[]) => {
  const normalizeSymbol = (symbol: string) => symbol.toUpperCase().replace(/\s*US\$\s*/g, '')
  const currentSymbols = new Set(currentPositions.map(position => normalizeSymbol(getPositionSymbol(position))))
  const symbols = new Map<string, PortfolioPosition['titulo']>()
  const balances = new Map<string, number>()
  const purchasedSymbols = new Set<string>()
  const chronological = [...operations].sort((a, b) => new Date(getOperationDate(a)).getTime() - new Date(getOperationDate(b)).getTime())

  for (const operation of chronological) {
    const symbol = String(operation.titulo?.simbolo ?? operation.simbolo ?? '').trim()
    const normalizedSymbol = normalizeSymbol(symbol)
    if (!symbol) continue
    if (!symbols.has(normalizedSymbol)) symbols.set(normalizedSymbol, {
      simbolo: operation.titulo?.simbolo ?? symbol,
      descripcion: operation.titulo?.descripcion ?? symbol,
      pais: operation.titulo?.pais ?? '',
      mercado: operation.titulo?.mercado ?? operation.mercado ?? '',
      tipo: operation.titulo?.tipo ?? '',
      plazo: operation.titulo?.plazo ?? operation.plazo ?? '',
      moneda: operation.titulo?.moneda ?? operation.moneda ?? ''
    })

    const code = getOperationCode(operation)
    const quantity = getOperationQuantity(operation)
    const currentQuantity = balances.get(normalizedSymbol) ?? 0
    if (code === 'C' || code === 'CI') {
      purchasedSymbols.add(normalizedSymbol)
      balances.set(normalizedSymbol, currentQuantity + quantity)
    }
    if (code === 'V' || code === 'VI') balances.set(normalizedSymbol, currentQuantity - quantity)
    if (code === 'SP' && currentQuantity > 0) balances.set(normalizedSymbol, currentQuantity + quantity)
  }

  return [...symbols.entries()]
    .filter(([symbol]) => purchasedSymbols.has(symbol) && !currentSymbols.has(symbol) && Math.abs(balances.get(symbol) ?? 0) < 0.0000001)
    .map(([, titulo]) => ({
      cantidad: 0,
      comprometido: 0,
      puntosVariacion: 0,
      variacionDiaria: 0,
      ultimoPrecio: 0,
      ppc: 0,
      gananciaPorcentaje: 0,
      gananciaDinero: 0,
      valorizado: 0,
      titulo,
      parking: null
    }))
}

export type OperationWithVariation = Operation & {
  variationAmount: number | null
  variationPercent: number | null
  displayQuantity?: number
  displayQuantityTitle?: string
  displayQuantityAddition?: number
}

export type EstimatedSaleLot = {
  operation: Operation
  quantity: number
  variationAmount: number
  variationPercent: number | null
}

export type EstimatedSale = {
  lots: EstimatedSaleLot[]
  totalSale: number
  variationAmount: number
  variationPercent: number | null
  availableQuantity: number
}

type PurchaseLot = {
  quantity: number
  price: number
}

export const calculateOperationVariations = (operations: Operation[], unit: DisplayUnit = 'ARS', rates: DisplayRates = { uva: 1, usd: 1 }): OperationWithVariation[] => {
  const chronological = operations
    .map((operation, index) => ({ operation, index }))
    .sort((a, b) => {
      const dateDifference = new Date(getOperationDate(a.operation)).getTime() - new Date(getOperationDate(b.operation)).getTime()
      return dateDifference || a.index - b.index
    })

  const lots: Array<PurchaseLot & { date: string; operationIndex: number }> = []
  const variations = new Map<number, { amount: number | null; percent: number | null }>()
  const displayQuantities = new Map<number, number>()
  const displayQuantityTitles = new Map<number, string>()
  const displayQuantityAdditions = new Map<number, number>()
  const activeDisplayQuantityIndexes = new Set<number>()

  for (const { operation, index } of chronological) {
    const code = getOperationCode(operation)
    const quantity = getOperationQuantity(operation)
    const price = getOperationPrice(operation)
    const operationDate = getOperationDate(operation)

    if (code === 'C' || code === 'CI') {
      if (quantity > 0) {
        lots.push({ quantity, price, date: operationDate, operationIndex: index })
        displayQuantities.set(index, quantity)
      }
      variations.set(index, { amount: null, percent: null })
      continue
    }

    if (code === 'SP') {
      const heldQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
      if (heldQuantity > 0 && quantity > 0) {
        const factor = (heldQuantity + quantity) / heldQuantity
        const splitRatio = Number(factor.toFixed(4))
        for (const lot of lots) {
          const lotQuantity = lot.quantity
          const lotAddition = quantity * lotQuantity / heldQuantity
          const splitTitle = `Tenía ${lotQuantity.toLocaleString('es-AR')} y se sumaron ${lotAddition.toLocaleString('es-AR')} por split ${splitRatio}:1.`
          lot.quantity *= factor
          lot.price /= factor
          displayQuantities.set(lot.operationIndex, (displayQuantities.get(lot.operationIndex) ?? 0) * factor)
          displayQuantityTitles.set(lot.operationIndex, splitTitle)
          displayQuantityAdditions.set(lot.operationIndex, lotAddition)
          activeDisplayQuantityIndexes.add(lot.operationIndex)
        }
      }
      variations.set(index, { amount: null, percent: null })
      continue
    }

    if (code !== 'V' && code !== 'VI') {
      variations.set(index, { amount: null, percent: null })
      continue
    }

    let remaining = quantity
    let cost = 0
    let coveredQuantity = 0
    let convertedCost = 0

    while (remaining > 0 && lots.length > 0) {
      const lastLot = lots[lots.length - 1]
      const consumed = Math.min(remaining, lastLot.quantity)
      cost += consumed * lastLot.price
      convertedCost += consumed * convertAmount(lastLot.price, unit, rates, lastLot.date)
      coveredQuantity += consumed
      remaining -= consumed
      lastLot.quantity -= consumed
      if (lastLot.quantity <= 0) {
        activeDisplayQuantityIndexes.delete(lastLot.operationIndex)
        lots.pop()
      }
    }

    if (coveredQuantity === 0) {
      variations.set(index, { amount: null, percent: null })
      continue
    }

    const convertedProceeds = coveredQuantity * convertAmount(price, unit, rates, operationDate)
    const amount = convertedProceeds - convertedCost
    variations.set(index, { amount, percent: convertedCost ? amount / convertedCost : null })
  }

  return operations.map((operation, index) => ({
    ...operation,
    variationAmount: variations.get(index)?.amount ?? null,
    variationPercent: variations.get(index)?.percent ?? null,
    ...(displayQuantities.has(index)
      ? {
        displayQuantity: activeDisplayQuantityIndexes.has(index) ? displayQuantities.get(index) : undefined,
        displayQuantityTitle: displayQuantityTitles.get(index),
        displayQuantityAddition: displayQuantityAdditions.get(index)
      }
      : {})
  }))
}

export const estimateSale = (operations: Operation[], quantityToSell: number, salePrice: number, unit: DisplayUnit = 'ARS', rates: DisplayRates = { uva: 1, usd: 1 }): EstimatedSale => {
  const chronological = [...operations].sort((a, b) => new Date(getOperationDate(a)).getTime() - new Date(getOperationDate(b)).getTime())
  const lots: Array<{ operation: Operation; quantity: number; price: number; date: string }> = []

  for (const operation of chronological) {
    const code = getOperationCode(operation)
    const quantity = getOperationQuantity(operation)

    if (code === 'C' || code === 'CI') {
      if (quantity > 0) lots.push({ operation, quantity, price: getOperationPrice(operation), date: getOperationDate(operation) })
      continue
    }

    if (code === 'SP') {
      const heldQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
      if (heldQuantity > 0 && quantity > 0) {
        const factor = (heldQuantity + quantity) / heldQuantity
        for (const lot of lots) {
          lot.quantity *= factor
          lot.price /= factor
        }
      }
      continue
    }

    if (code === 'V' || code === 'VI') {
      let remaining = quantity
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[lots.length - 1]
        const consumed = Math.min(remaining, lot.quantity)
        lot.quantity -= consumed
        remaining -= consumed
        if (lot.quantity <= 0) lots.pop()
      }
    }
  }

  const availableQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  let remaining = Math.max(0, quantityToSell)
  const affectedLots: EstimatedSaleLot[] = []

  while (remaining > 0 && lots.length > 0) {
    const lot = lots[lots.length - 1]
    const consumed = Math.min(remaining, lot.quantity)
    const variationAmount = consumed * (convertAmount(salePrice, unit, rates) - convertAmount(lot.price, unit, rates, lot.date))
    const cost = consumed * convertAmount(lot.price, unit, rates, lot.date)
    affectedLots.push({
      operation: lot.operation,
      quantity: consumed,
      variationAmount,
      variationPercent: cost ? variationAmount / cost : null
    })
    remaining -= consumed
    lot.quantity -= consumed
    if (lot.quantity <= 0) lots.pop()
  }

  const totalSale = affectedLots.reduce((sum, lot) => sum + lot.quantity * convertAmount(salePrice, unit, rates), 0)
  const variationAmount = affectedLots.reduce((sum, lot) => sum + lot.variationAmount, 0)
  const totalCost = affectedLots.reduce((sum, lot) => sum + lot.quantity * convertAmount(getOperationPrice(lot.operation), unit, rates, getOperationDate(lot.operation)), 0)

  return {
    lots: affectedLots,
    totalSale,
    variationAmount,
    variationPercent: totalCost ? variationAmount / totalCost : null,
    availableQuantity
  }
}
