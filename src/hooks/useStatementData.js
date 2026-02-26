import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyCategoryOverrides,
  buildStatementDatabasePayload,
  buildDashboardData,
  loadStatementDatabaseFromPublicFile,
  loadStatementTransactionsFromPublicFile,
  loadStatementTransactionsFromUploadedFile,
  mergeTransactions,
} from '../services/statementService'
import {
  CATEGORY_OPTIONS,
  removeCategoryOverride,
  setCategoryOverride,
} from '../utils/categoryOverrides'

const defaultData = {
  transactions: [],
  totalEntradas: 0,
  totalSaidas: 0,
  saldoLiquido: 0,
  saldoAtual: 0,
  categorySummary: [],
}

export function useStatementData() {
  const defaultDbFileName = import.meta.env.VITE_STATEMENT_DB_FILE || 'data/statement-db.json'
  const defaultFileName =
    import.meta.env.VITE_STATEMENT_FILE || 'Extrato-10-10-2024-a-21-02-2026-CSV.csv'
  const [baseTransactions, setBaseTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceLabel, setSourceLabel] = useState(defaultDbFileName)
  const [importSummary, setImportSummary] = useState('')
  const [overrides, setOverrides] = useState({})

  const data = useMemo(() => {
    if (!baseTransactions.length) return defaultData
    const transactions = applyCategoryOverrides(baseTransactions, overrides)
    return buildDashboardData(transactions)
  }, [baseTransactions, overrides])

  const loadDefaultFile = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const database = await loadStatementDatabaseFromPublicFile(defaultDbFileName)

      setBaseTransactions(database.transactions)
      setOverrides(database.overrides)
      setSourceLabel(database.sourceLabel || defaultDbFileName)
      setImportSummary(`Banco principal carregado com ${database.transactions.length} lancamentos.`)
    } catch {
      try {
        const importedTransactions = await loadStatementTransactionsFromPublicFile(defaultFileName)
        const merged = mergeTransactions([], importedTransactions)

        setBaseTransactions(merged.transactions)
        setOverrides({})
        setSourceLabel(defaultFileName)
        setImportSummary(
          `Banco principal nao encontrado. Base carregada do CSV (${merged.transactions.length} lancamentos).`,
        )
      } catch (loadError) {
        setError(loadError.message || 'Falha ao carregar a base padrao.')
        setBaseTransactions([])
        setOverrides({})
        setImportSummary('')
      }
    } finally {
      setLoading(false)
    }
  }, [defaultDbFileName, defaultFileName])

  const loadUploadedFile = useCallback(async (file) => {
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const importedTransactions = await loadStatementTransactionsFromUploadedFile(file)
      const merged = mergeTransactions(baseTransactions, importedTransactions)
      const summary =
        merged.duplicateCount > 0
          ? `Importacao em sessao: ${merged.addedCount} novos lancamentos e ${merged.duplicateCount} duplicados ignorados. Clique em "Salvar banco" para persistir no banco principal.`
          : `Importacao em sessao: ${merged.addedCount} novos lancamentos. Clique em "Salvar banco" para persistir no banco principal.`
      const uploadLabel = `${file.name} (sessao: +${merged.addedCount}, dup ${merged.duplicateCount})`

      setBaseTransactions(merged.transactions)
      setSourceLabel(uploadLabel)
      setImportSummary(summary)
    } catch (loadError) {
      setError(loadError.message || 'Falha ao carregar o CSV enviado.')
      setImportSummary('')
    } finally {
      setLoading(false)
    }
  }, [baseTransactions])

  const saveManualCategory = useCallback((description, category) => {
    setOverrides((current) => setCategoryOverride(current, description, category))
  }, [])

  const clearManualCategory = useCallback((description) => {
    setOverrides((current) => removeCategoryOverride(current, description))
  }, [])

  const buildCurrentDatabaseJson = useCallback(() => {
    const resolvedTransactions = applyCategoryOverrides(baseTransactions, overrides)
    const payload = buildStatementDatabasePayload({
      sourceLabel: 'Banco principal (Git)',
      overrides,
      transactions: resolvedTransactions,
    })

    return `${JSON.stringify(payload, null, 2)}\n`
  }, [baseTransactions, overrides])

  const exportCurrentDatabase = useCallback(() => {
    const jsonContent = buildCurrentDatabaseJson()
    const blob = new Blob([jsonContent], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'statement-db.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [buildCurrentDatabaseJson])

  const saveCurrentDatabase = useCallback(async () => {
    const jsonContent = buildCurrentDatabaseJson()
    const canUseServerSave = typeof window !== 'undefined'

    if (canUseServerSave) {
      try {
        const response = await fetch('/api/statement-db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: defaultDbFileName,
            content: jsonContent,
          }),
        })

        if (response.ok) {
          const payload = await response.json()
          setImportSummary(
            `Banco principal salvo automaticamente em ${payload.path}. Agora basta fazer commit.`,
          )
          return
        }
      } catch {
        // Fallback para gravacao manual quando a API local nao estiver disponivel.
      }
    }

    const canUseFilePicker =
      typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'

    if (!canUseFilePicker) {
      const blob = new Blob([jsonContent], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'statement-db.json'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      setImportSummary(
        'Navegador sem gravacao direta. Banco exportado para download; substitua o arquivo public/data/statement-db.json e faca commit.',
      )
      return
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'statement-db.json',
        types: [
          {
            description: 'Arquivo JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(jsonContent)
      await writable.close()
      setImportSummary(
        'Banco salvo com sucesso. Use este arquivo como public/data/statement-db.json e compartilhe via commit.',
      )
    } catch (error) {
      const aborted = error?.name === 'AbortError'
      if (!aborted) {
        setImportSummary(
          'Falha ao salvar direto no arquivo. O arquivo foi exportado para download; substitua public/data/statement-db.json manualmente.',
        )
        exportCurrentDatabase()
      }
    }
  }, [buildCurrentDatabaseJson, defaultDbFileName, exportCurrentDatabase])

  useEffect(() => {
    loadDefaultFile()
  }, [loadDefaultFile])

  return useMemo(
    () => ({
      data,
      loading,
      error,
      sourceLabel,
      importSummary,
      overrides,
      categoryOptions: CATEGORY_OPTIONS,
      loadDefaultFile,
      loadUploadedFile,
      saveManualCategory,
      clearManualCategory,
      exportCurrentDatabase,
      saveCurrentDatabase,
    }),
    [
      data,
      error,
      loadDefaultFile,
      loadUploadedFile,
      loading,
      sourceLabel,
      importSummary,
      overrides,
      saveManualCategory,
      clearManualCategory,
      exportCurrentDatabase,
      saveCurrentDatabase,
    ],
  )
}
