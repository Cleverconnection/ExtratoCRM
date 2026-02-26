import { CATEGORY_RULES } from '../data/categoryRules'
import { normalizeText } from './normalizeText'

function normalizeForMatch(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

function hasKeyword(content, keyword) {
  const normalizedKeyword = normalizeForMatch(keyword)
  if (!normalizedKeyword) return false
  return ` ${content} `.includes(` ${normalizedKeyword} `)
}

export function categorizeTransaction(transaction) {
  const content = normalizeForMatch(`${transaction.historico} ${transaction.descricao}`)

  for (const rule of CATEGORY_RULES) {
    const found = rule.keywords.some((keyword) => hasKeyword(content, keyword))
    if (found) return rule.category
  }

  if (transaction.value >= 0) return 'Receitas'
  return 'Generica'
}
