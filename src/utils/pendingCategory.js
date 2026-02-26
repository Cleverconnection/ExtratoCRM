import { normalizeText } from './normalizeText'

export function isPendingCategory(category) {
  const normalized = normalizeText(category)
  return normalized === 'comercio local' || normalized === 'generica' || normalized === 'generico'
}
