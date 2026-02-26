import Papa from 'papaparse'
import { categorizeTransaction } from '../utils/categorizer'
import { normalizeCategoryOverrides } from '../utils/categoryOverrides'
import { canonicalizeCategory } from '../utils/categoryNormalizer'
import { normalizeText } from '../utils/normalizeText'
import { getDescriptionKey } from '../utils/descriptionKey'

function parseBrNumber(rawValue) {
  const prepared = String(rawValue || '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/\s+/g, '')
    .trim()

  const parsed = Number(prepared)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseBrDate(rawValue) {
  const [day, month, year] = String(rawValue || '')
    .split('/')
    .map((value) => Number(value))

  if (!day || !month || !year) return null

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateLabel(date) {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function cleanCell(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
}

function normalizeKeyText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

function toDateKey(date, dateLabel = '') {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }

  const parsedDate = parseBrDate(dateLabel)
  if (parsedDate) {
    return parsedDate.toISOString().slice(0, 10)
  }

  return normalizeKeyText(dateLabel || '')
}

function toNumberKey(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '0.00'
  return parsed.toFixed(2)
}

function parseAnyDate(value, dateLabel = '') {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value

  const brDate = parseBrDate(dateLabel)
  if (brDate) return brDate

  if (typeof value === 'string' && value) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  return null
}

export function getTransactionFingerprint(transaction) {
  return [
    toDateKey(transaction.date, transaction.dateLabel),
    normalizeKeyText(transaction.historico),
    normalizeKeyText(transaction.descricao),
    toNumberKey(transaction.value),
    toNumberKey(transaction.balance),
  ].join('|')
}

function toNormalizedTransaction(transaction) {
  if (!transaction || typeof transaction !== 'object') return null

  const date = parseAnyDate(transaction.date, transaction.dateLabel)
  if (!date) return null

  const value = Number(transaction.value)
  const balance = Number(transaction.balance)
  if (!Number.isFinite(value) || !Number.isFinite(balance)) return null

  const historico = cleanCell(transaction.historico)
  const descricao = cleanCell(transaction.descricao)
  const dateLabel = cleanCell(transaction.dateLabel) || toDateLabel(date)
  const baseCategory = canonicalizeCategory(
    cleanCell(transaction.baseCategory) ||
      cleanCell(transaction.category) ||
      categorizeTransaction({ historico, descricao, value }),
    value,
  )
  const category = canonicalizeCategory(
    cleanCell(transaction.category) || cleanCell(transaction.baseCategory) || baseCategory,
    value,
  )

  const normalized = {
    date,
    dateLabel,
    historico,
    descricao,
    value,
    balance,
    type: value >= 0 ? 'entrada' : 'saida',
    baseCategory,
    category,
  }

  return {
    ...normalized,
    id: getTransactionFingerprint(normalized),
  }
}

export function sortTransactionsByDateDesc(transactions) {
  return [...transactions].sort((left, right) => {
    const dateDiff = right.date - left.date
    if (dateDiff !== 0) return dateDiff
    return right.balance - left.balance
  })
}

export function mergeTransactions(existingTransactions = [], incomingTransactions = []) {
  const merged = []
  const seen = new Set()
  let addedCount = 0
  let duplicateCount = 0

  existingTransactions.forEach((transaction) => {
    const normalized = toNormalizedTransaction(transaction)
    if (!normalized) return

    if (seen.has(normalized.id)) return
    seen.add(normalized.id)
    merged.push(normalized)
  })

  incomingTransactions.forEach((transaction) => {
    const normalized = toNormalizedTransaction(transaction)
    if (!normalized) return

    if (seen.has(normalized.id)) {
      duplicateCount += 1
      return
    }

    seen.add(normalized.id)
    merged.push(normalized)
    addedCount += 1
  })

  return {
    transactions: sortTransactionsByDateDesc(merged),
    addedCount,
    duplicateCount,
  }
}

function parseDatabaseTransaction(rawTransaction) {
  if (!rawTransaction || typeof rawTransaction !== 'object') return null

  return toNormalizedTransaction({
    ...rawTransaction,
    date: rawTransaction.date,
    dateLabel: rawTransaction.dateLabel,
  })
}

export function parseStatementDatabasePayload(payload = {}) {
  const sourceLabel = cleanCell(payload.sourceLabel)
  const overrides = normalizeCategoryOverrides(payload.overrides)
  const parsedTransactions = Array.isArray(payload.transactions)
    ? payload.transactions.map(parseDatabaseTransaction).filter(Boolean)
    : []
  const merged = mergeTransactions([], parsedTransactions)

  return {
    sourceLabel,
    overrides,
    transactions: merged.transactions,
  }
}

export function buildStatementDatabasePayload({
  sourceLabel = '',
  overrides = {},
  transactions = [],
} = {}) {
  const normalized = parseStatementDatabasePayload({
    sourceLabel,
    overrides,
    transactions,
  })

  return {
    version: 1,
    sourceLabel: normalized.sourceLabel,
    overrides: normalized.overrides,
    updatedAt: new Date().toISOString(),
    transactions: normalized.transactions.map((transaction) => ({
      ...transaction,
      date: transaction.date.toISOString(),
    })),
  }
}

function isHeaderRow(row) {
  if (!row || row.length < 5) return false
  const first = cleanCell(row[0]).toLowerCase()
  const second = cleanCell(row[1]).toLowerCase()
  return first.includes('data') && second.includes('hist')
}

function parseCsvRows(csvText) {
  const { data } = Papa.parse(csvText, {
    delimiter: ';',
    skipEmptyLines: false,
  })

  return data.map((row) => (Array.isArray(row) ? row.map(cleanCell) : []))
}

export function applyCategoryOverrides(transactions, overrides = {}) {
  if (!transactions.length) return transactions

  return transactions.map((transaction) => {
    const descriptionKey = getDescriptionKey(transaction.descricao)
    const overrideCategory = overrides[descriptionKey]
    const resolvedCategory = canonicalizeCategory(
      overrideCategory || transaction.baseCategory || transaction.category,
      transaction.value,
    )

    return {
      ...transaction,
      category: resolvedCategory,
    }
  })
}

export function parseStatementCsv(csvText) {
  const rows = parseCsvRows(csvText)
  const headerRowIndex = rows.findIndex((row) => isHeaderRow(row))

  if (headerRowIndex === -1) {
    throw new Error('Cabecalho do CSV nao encontrado. Verifique o layout do extrato.')
  }

  const transactionRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.length >= 5 && cleanCell(row[0]) !== '' && cleanCell(row[1]) !== '')

  const parsed = transactionRows
    .map((row) => {
      const date = parseBrDate(row[0])
      if (!date) return null

      const value = parseBrNumber(row[3])
      const balance = parseBrNumber(row[4])

      const transaction = {
        date,
        dateLabel: row[0],
        historico: row[1],
        descricao: row[2],
        value,
        balance,
      }

      return toNormalizedTransaction(transaction)
    })
    .filter(Boolean)

  return mergeTransactions([], parsed).transactions
}

function buildCategorySummary(transactions) {
  const totals = new Map()

  transactions.forEach((transaction) => {
    if (transaction.value >= 0) return

    const amount = Math.abs(transaction.value)
    const category = canonicalizeCategory(transaction.category, transaction.value)
    const categoryKey = normalizeText(category).replace(/[^a-z0-9]+/g, '')
    const current = totals.get(categoryKey) || { category, total: 0 }

    totals.set(categoryKey, {
      category: current.category || category,
      total: current.total + amount,
    })
  })

  return [...totals.values()].sort((left, right) => right.total - left.total)
}

export function buildDashboardData(transactions) {
  let totalEntradas = 0
  let totalSaidas = 0

  transactions.forEach((transaction) => {
    if (transaction.value >= 0) totalEntradas += transaction.value
    else totalSaidas += Math.abs(transaction.value)
  })

  return {
    transactions,
    totalEntradas,
    totalSaidas,
    saldoLiquido: totalEntradas - totalSaidas,
    saldoAtual: transactions[0]?.balance || 0,
    categorySummary: buildCategorySummary(transactions),
  }
}

export async function loadStatementFromPublicFile(fileName) {
  const response = await fetch(`/${encodeURI(fileName)}`)

  if (!response.ok) {
    throw new Error(`Arquivo ${fileName} nao encontrado em /public.`)
  }

  const csvText = await response.text()
  const transactions = parseStatementCsv(csvText)
  return buildDashboardData(transactions)
}

export async function loadStatementFromUploadedFile(file) {
  const csvText = await file.text()
  const transactions = parseStatementCsv(csvText)
  return buildDashboardData(transactions)
}

export async function loadStatementTransactionsFromPublicFile(fileName) {
  const response = await fetch(`/${encodeURI(fileName)}`)

  if (!response.ok) {
    throw new Error(`Arquivo ${fileName} nao encontrado em /public.`)
  }

  const csvText = await response.text()
  return parseStatementCsv(csvText)
}

export async function loadStatementTransactionsFromUploadedFile(file) {
  const csvText = await file.text()
  return parseStatementCsv(csvText)
}

export async function loadStatementDatabaseFromPublicFile(fileName) {
  const response = await fetch(`/${encodeURI(fileName)}`)

  if (!response.ok) {
    throw new Error(`Arquivo ${fileName} nao encontrado em /public.`)
  }

  const payload = await response.json()
  return parseStatementDatabasePayload(payload)
}
