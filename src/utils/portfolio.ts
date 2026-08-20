import type { AccountEntry, AccountResponse, Operation, PortfolioPosition } from '../types'

export const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const pct = new Intl.NumberFormat('es-AR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const getAccountAvailable = (account: AccountResponse | null) => {
  const firstAccount = account?.cuentas?.[0] as AccountEntry | undefined
  return firstAccount?.disponible ?? 0
}

export const getOperationDate = (operation: Operation) => String(operation.fechaOperada ?? operation.fechaOrden ?? operation.fecha ?? '—')
export const getOperationQuantity = (operation: Operation) => Number(operation.cantidadOperada ?? operation.cantidad ?? 0)
export const getOperationPrice = (operation: Operation) => Number(operation.precioOperado ?? operation.precio ?? 0)
export const getOperationTotal = (operation: Operation) => Number(operation.montoOperado ?? operation.monto ?? getOperationPrice(operation) * getOperationQuantity(operation))

export const getOperationCode = (operation: Operation) => {
  const type = String(operation.tipo ?? operation.operacion ?? '').toLowerCase()
  const term = String(operation.plazo ?? '').toLowerCase()

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
    O: 'Otra operación'
  }
  return labels[getOperationCode(operation)]
}

export const getPositionSymbol = (position: PortfolioPosition) => position.titulo?.simbolo ?? '—'

export type OperationWithVariation = Operation & {
  variationAmount: number | null
  variationPercent: number | null
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

export const calculateOperationVariations = (operations: Operation[]): OperationWithVariation[] => {
  const chronological = operations
    .map((operation, index) => ({ operation, index }))
    .sort((a, b) => {
      const dateDifference = new Date(getOperationDate(a.operation)).getTime() - new Date(getOperationDate(b.operation)).getTime()
      return dateDifference || a.index - b.index
    })

  const lots: PurchaseLot[] = []
  const variations = new Map<number, { amount: number | null; percent: number | null }>()

  for (const { operation, index } of chronological) {
    const code = getOperationCode(operation)
    const quantity = getOperationQuantity(operation)
    const price = getOperationPrice(operation)

    if (code === 'C' || code === 'CI') {
      if (quantity > 0) lots.push({ quantity, price })
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

    while (remaining > 0 && lots.length > 0) {
      const lastLot = lots[lots.length - 1]
      const consumed = Math.min(remaining, lastLot.quantity)
      cost += consumed * lastLot.price
      coveredQuantity += consumed
      remaining -= consumed
      lastLot.quantity -= consumed
      if (lastLot.quantity <= 0) lots.pop()
    }

    if (coveredQuantity === 0) {
      variations.set(index, { amount: null, percent: null })
      continue
    }

    const proceeds = coveredQuantity * price
    const amount = proceeds - cost
    variations.set(index, { amount, percent: cost ? amount / cost : null })
  }

  return operations.map((operation, index) => ({
    ...operation,
    variationAmount: variations.get(index)?.amount ?? null,
    variationPercent: variations.get(index)?.percent ?? null
  }))
}

export const estimateSale = (operations: Operation[], quantityToSell: number, salePrice: number): EstimatedSale => {
  const chronological = [...operations].sort((a, b) => new Date(getOperationDate(a)).getTime() - new Date(getOperationDate(b)).getTime())
  const lots: Array<{ operation: Operation; quantity: number; price: number }> = []

  for (const operation of chronological) {
    const code = getOperationCode(operation)
    const quantity = getOperationQuantity(operation)

    if (code === 'C' || code === 'CI') {
      if (quantity > 0) lots.push({ operation, quantity, price: getOperationPrice(operation) })
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
    const variationAmount = consumed * (salePrice - lot.price)
    const cost = consumed * lot.price
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

  const totalSale = affectedLots.reduce((sum, lot) => sum + lot.quantity * salePrice, 0)
  const variationAmount = affectedLots.reduce((sum, lot) => sum + lot.variationAmount, 0)
  const totalCost = affectedLots.reduce((sum, lot) => sum + lot.quantity * getOperationPrice(lot.operation), 0)

  return {
    lots: affectedLots,
    totalSale,
    variationAmount,
    variationPercent: totalCost ? variationAmount / totalCost : null,
    availableQuantity
  }
}
