import { CATEGORY_RULES } from '../data/categoryRules'
import { canonicalizeCategory } from './categoryNormalizer'
import { getDescriptionKey } from './descriptionKey'

const BASE_OPTIONS = [
  ...CATEGORY_RULES.map((rule) => rule.category),
  'Comercio Local',
  'Generica',
]

export const CATEGORY_OPTIONS = [...new Set(BASE_OPTIONS)]

export function normalizeCategoryOverrides(overrides = {}) {
  if (!overrides || typeof overrides !== 'object') return {}

  const normalized = {}
  Object.entries(overrides).forEach(([key, value]) => {
    const descriptionKey = getDescriptionKey(key)
    if (!descriptionKey) return
    normalized[descriptionKey] = canonicalizeCategory(value, -1)
  })

  return normalized
}

export function setCategoryOverride(currentOverrides, description, category) {
  const key = getDescriptionKey(description)
  const current = normalizeCategoryOverrides(currentOverrides)
  const next = {
    ...current,
    [key]: canonicalizeCategory(category, -1),
  }

  return next
}

export function removeCategoryOverride(currentOverrides, description) {
  const key = getDescriptionKey(description)
  const current = normalizeCategoryOverrides(currentOverrides)

  if (!(key in current)) return current

  const next = { ...current }
  delete next[key]
  return next
}
