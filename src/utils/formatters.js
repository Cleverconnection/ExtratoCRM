export const brCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export const brDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
})

export function formatCurrency(value) {
  return brCurrencyFormatter.format(value || 0)
}

export function formatDate(value) {
  if (!value) return '-'
  return brDateFormatter.format(value)
}
