import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import Papa from 'papaparse'
import { CATEGORY_RULES } from '../src/data/categoryRules.js'

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'public/data/statement-db.json')

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeForMatch(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

function cleanCell(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
}

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

function getDescriptionKey(description) {
  return normalizeText(description).replace(/\s+/g, ' ').trim()
}

function hasKeyword(content, keyword) {
  const normalizedKeyword = normalizeForMatch(keyword)
  if (!normalizedKeyword) return false
  return ` ${content} `.includes(` ${normalizedKeyword} `)
}

function categorizeTransaction({ historico, descricao, value }) {
  const content = normalizeForMatch(`${historico} ${descricao}`)

  for (const rule of CATEGORY_RULES) {
    const found = rule.keywords.some((keyword) => hasKeyword(content, keyword))
    if (found) return rule.category
  }

  return value >= 0 ? 'Receitas' : 'Generica'
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

function getTransactionFingerprint(transaction) {
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
  const dateLabel = cleanCell(transaction.dateLabel)
  const baseCategory = cleanCell(transaction.baseCategory) || categorizeTransaction({
    historico,
    descricao,
    value,
  })

  const normalized = {
    date,
    dateLabel,
    historico,
    descricao,
    value,
    balance,
    type: value >= 0 ? 'entrada' : 'saida',
    baseCategory,
    category: cleanCell(transaction.category) || baseCategory,
  }

  return {
    ...normalized,
    id: getTransactionFingerprint(normalized),
  }
}

function sortTransactionsByDateDesc(transactions) {
  return [...transactions].sort((left, right) => {
    const dateDiff = right.date - left.date
    if (dateDiff !== 0) return dateDiff
    return right.balance - left.balance
  })
}

function mergeTransactions(existingTransactions = [], incomingTransactions = []) {
  const merged = []
  const seen = new Set()
  let addedCount = 0
  let duplicateCount = 0

  for (const transaction of existingTransactions) {
    const normalized = toNormalizedTransaction(transaction)
    if (!normalized) continue
    if (seen.has(normalized.id)) continue
    seen.add(normalized.id)
    merged.push(normalized)
  }

  for (const transaction of incomingTransactions) {
    const normalized = toNormalizedTransaction(transaction)
    if (!normalized) continue

    if (seen.has(normalized.id)) {
      duplicateCount += 1
      continue
    }

    seen.add(normalized.id)
    merged.push(normalized)
    addedCount += 1
  }

  return {
    transactions: sortTransactionsByDateDesc(merged),
    addedCount,
    duplicateCount,
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

function parseStatementCsv(csvText) {
  const rows = parseCsvRows(csvText)
  const headerRowIndex = rows.findIndex((row) => isHeaderRow(row))

  if (headerRowIndex === -1) {
    throw new Error('Cabecalho do CSV nao encontrado.')
  }

  const transactionRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.length >= 5 && cleanCell(row[0]) !== '' && cleanCell(row[1]) !== '')

  const parsedTransactions = transactionRows
    .map((row) => {
      const date = parseBrDate(row[0])
      if (!date) return null

      return toNormalizedTransaction({
        date,
        dateLabel: row[0],
        historico: row[1],
        descricao: row[2],
        value: parseBrNumber(row[3]),
        balance: parseBrNumber(row[4]),
      })
    })
    .filter(Boolean)

  return mergeTransactions([], parsedTransactions).transactions
}

function normalizeOverrides(overrides) {
  if (!overrides || typeof overrides !== 'object') return {}

  const normalized = {}
  for (const [key, value] of Object.entries(overrides)) {
    const descriptionKey = getDescriptionKey(key)
    if (!descriptionKey) continue
    normalized[descriptionKey] = cleanCell(value)
  }
  return normalized
}

function applyOverrides(transactions, overrides) {
  return transactions.map((transaction) => {
    const descriptionKey = getDescriptionKey(transaction.descricao)
    const overrideCategory = overrides[descriptionKey]
    if (!overrideCategory) return transaction

    return {
      ...transaction,
      category: overrideCategory,
    }
  })
}

async function readDatabase(dbPath) {
  try {
    const raw = await fs.readFile(dbPath, 'utf8')
    const parsed = JSON.parse(raw)
    const overrides = normalizeOverrides(parsed.overrides)
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : []

    return {
      sourceLabel: cleanCell(parsed.sourceLabel) || 'Banco principal',
      overrides,
      transactions,
    }
  } catch {
    return {
      sourceLabel: 'Banco principal',
      overrides: {},
      transactions: [],
    }
  }
}

async function writeDatabase(dbPath, { sourceLabel, overrides, transactions }) {
  const payload = {
    version: 1,
    sourceLabel,
    overrides: normalizeOverrides(overrides),
    updatedAt: new Date().toISOString(),
    transactions: transactions.map((transaction) => ({
      ...transaction,
      date: transaction.date.toISOString(),
    })),
  }

  await fs.mkdir(path.dirname(dbPath), { recursive: true })
  await fs.writeFile(dbPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function main() {
  const [, , csvArg, ...rest] = process.argv
  const dbFlagIndex = rest.findIndex((arg) => arg === '--db')
  const dbPathArg = dbFlagIndex >= 0 ? rest[dbFlagIndex + 1] : ''
  const dbPath = dbPathArg ? path.resolve(process.cwd(), dbPathArg) : DEFAULT_DB_PATH

  if (!csvArg) {
    console.error('Uso: npm run db:merge -- "<caminho-do-extrato.csv>" [--db "<caminho-do-db.json>"]')
    process.exit(1)
  }

  const csvPath = path.resolve(process.cwd(), csvArg)
  const csvText = await fs.readFile(csvPath, 'utf8')
  const incomingTransactions = parseStatementCsv(csvText)
  const existingDb = await readDatabase(dbPath)
  const merged = mergeTransactions(existingDb.transactions, incomingTransactions)
  const transactionsWithOverrides = applyOverrides(merged.transactions, existingDb.overrides)

  await writeDatabase(dbPath, {
    sourceLabel: 'Banco principal (Git)',
    overrides: existingDb.overrides,
    transactions: transactionsWithOverrides,
  })

  console.log(
    [
      `Arquivo DB: ${dbPath}`,
      `CSV importado: ${csvPath}`,
      `Novos lancamentos: ${merged.addedCount}`,
      `Duplicados ignorados: ${merged.duplicateCount}`,
      `Total no banco: ${transactionsWithOverrides.length}`,
    ].join('\n'),
  )
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exit(1)
})
