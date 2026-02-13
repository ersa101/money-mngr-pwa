'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Zap, Check, X, ChevronDown, MessageSquare, Clock, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { parseMagicInput, type MagicBoxParseResult, type MatchCandidate } from '@/lib/magicBoxParser'
import { parseSMS, shouldAutoSubmit, type ParsedSMS } from '@/lib/smsParser'
import { llmService, type LLMResponse, type TransactionSuggestion } from '@/lib/llmService';
import useTransaction from '@/hooks/useTransaction'

interface MagicBoxProps {
  onSuccess?: () => void
}

type InputMode = 'quick' | 'sms'

export function MagicBox({ onSuccess }: MagicBoxProps) {
  const [input, setInput] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('quick')
  const [parseResult, setParseResult] = useState<MagicBoxParseResult | null>(null)
  const [smsResult, setSmsResult] = useState<ParsedSMS | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  // LLM suggestion state
  const [llmSuggestion, setLlmSuggestion] = useState<TransactionSuggestion | null>(null)
  const [llmProvider, setLlmProvider] = useState<string | null>(null)
  const [llmLoading, setLlmLoading] = useState(false)
  const [llmError, setLlmError] = useState<string | null>(null)

  // Auto-submit countdown
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Override selections
  const [overrideAccountId, setOverrideAccountId] = useState<number | null>(null)
  const [overrideCategoryId, setOverrideCategoryId] = useState<number | null>(null)
  const [overrideSubCategory, setOverrideSubCategory] = useState<string | null>(null)

  const accounts = useLiveQuery(() => db.accounts.toArray())
  const categories = useLiveQuery(() => db.categories.toArray())
  const recentTransactions = useLiveQuery(async () => {
    const all = await db.transactions.toArray()
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50)
  })
  const { createTransaction, loading } = useTransaction()

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // Function to get LLM suggestion
  const fetchLLMSuggestion = async (smsText: string) => {
    if (!llmService.hasApiKeys() || !categories || !accounts || !recentTransactions) {
      return
    }

    setLlmLoading(true)
    setLlmError(null)
    setLlmSuggestion(null)
    setLlmProvider(null)

    try {
      // Prepare data for LLM
      const existingCategories = categories.map(c => ({
        name: c.name,
        type: c.type,
        subCategories: [] as string[] // We'll get subcategories from transactions
      }))

      // Get subcategories from transactions
      const subCatMap = new Map<string, Set<string>>()
      recentTransactions.forEach(tx => {
        if (tx.category && tx.subCategory) {
          if (!subCatMap.has(tx.category)) {
            subCatMap.set(tx.category, new Set())
          }
          subCatMap.get(tx.category)!.add(tx.subCategory)
        }
      })
      existingCategories.forEach(cat => {
        const subs = subCatMap.get(cat.name)
        if (subs) {
          cat.subCategories = Array.from(subs)
        }
      })

      const existingAccounts = accounts.map(a => ({
        name: a.name,
        type: a.type
      }))

      const txForLLM = recentTransactions.slice(0, 20).map(tx => ({
        category: tx.category || '',
        subCategory: tx.subCategory,
        merchant: tx.description,
        description: tx.description
      })).filter(t => t.category)

      const result = await llmService.getSuggestion(
        smsText,
        existingCategories,
        existingAccounts,
        txForLLM
      )

      if (result.success && result.suggestion) {
        setLlmSuggestion(result.suggestion)
        setLlmProvider(result.provider)

        // Auto-apply LLM suggestions if confidence is high
        if (result.suggestion.confidence >= 70) {
          // Find matching account
          if (result.suggestion.accountName) {
            const matchedAccount = accounts.find(a =>
              a.name.toLowerCase().includes(result.suggestion!.accountName!.toLowerCase()) ||
              result.suggestion!.accountName!.toLowerCase().includes(a.name.toLowerCase())
            )
            if (matchedAccount?.id) {
              setOverrideAccountId(matchedAccount.id)
            }
          }

          // Find matching category
          if (result.suggestion.category) {
            const matchedCategory = categories.find(c =>
              c.name.toLowerCase() === result.suggestion!.category!.toLowerCase()
            )
            if (matchedCategory?.id) {
              setOverrideCategoryId(matchedCategory.id)
            }
          }

          // Set subcategory
          if (result.suggestion.subCategory) {
            setOverrideSubCategory(result.suggestion.subCategory)
          }
        }
      } else {
        setLlmError(result.error || 'LLM suggestion failed')
      }
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : 'LLM request failed')
    } finally {
      setLlmLoading(false)
    }
  }

  // Debounced parse
  useEffect(() => {
    if (!input.trim() || !accounts || !categories) {
      setParseResult(null)
      setSmsResult(null)
      setShowPreview(false)
      setLlmSuggestion(null)
      setLlmError(null)
      setLlmProvider(null)
      cancelCountdown()
      return
    }

    const timer = setTimeout(() => {
      if (inputMode === 'sms') {
        // Parse as SMS
        const result = parseSMS(input)
        setSmsResult(result)
        setParseResult(null)
        setShowPreview(true)
        setOverrideAccountId(null)
        setOverrideCategoryId(null)
        setOverrideSubCategory(null)
        setLlmSuggestion(null)
        setLlmError(null)

        // Fetch LLM suggestion if API keys are configured
        if (llmService.hasApiKeys() && result.amount > 0) {
          fetchLLMSuggestion(input)
        }

        // Start auto-submit countdown if confidence is high (only if no LLM)
        if (shouldAutoSubmit(result) && !llmService.hasApiKeys()) {
          startCountdown()
        }
      } else {
        // Parse as quick input
        const acctCandidates: MatchCandidate[] = accounts.map((a) => ({ id: a.id!, name: a.name }))
        const catCandidates: MatchCandidate[] = categories.map((c) => ({ id: c.id!, name: c.name }))
        const result = parseMagicInput(input, acctCandidates, catCandidates)
        setParseResult(result)
        setSmsResult(null)
        setShowPreview(true)
        setOverrideAccountId(null)
        setOverrideCategoryId(null)
        setLlmSuggestion(null)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [input, accounts, categories, inputMode])

  // Countdown functions
  const startCountdown = () => {
    cancelCountdown()
    setCountdown(3)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          cancelCountdown()
          // Auto-submit with PENDING status
          handleSmsConfirm(true)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const cancelCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(null)
  }

  const getEffectiveAccountId = useCallback(() => {
    if (overrideAccountId !== null) return overrideAccountId
    return parseResult?.accountMatch?.id ?? null
  }, [overrideAccountId, parseResult])

  const getEffectiveCategoryId = useCallback(() => {
    if (overrideCategoryId !== null) return overrideCategoryId
    return parseResult?.categoryMatch?.id ?? null
  }, [overrideCategoryId, parseResult])

  const handleConfirm = async () => {
    if (!parseResult || !parseResult.amount) return

    const accountId = getEffectiveAccountId()
    const categoryId = getEffectiveCategoryId()

    if (!accountId || accountId <= 0) {
      setStatus('error')
      setStatusMsg('Select an account')
      return
    }

    try {
      await createTransaction({
        fromAccountId: accountId,
        toCategoryId: parseResult.transactionType !== 'TRANSFER' ? (categoryId && categoryId > 0 ? categoryId : undefined) : undefined,
        toAccountId: parseResult.transactionType === 'TRANSFER' ? (categoryId && categoryId > 0 ? categoryId : undefined) : undefined,
        amount: parseResult.amount,
        description: parseResult.description || parseResult.rawInput,
        date: parseResult.date,
        isTransfer: parseResult.transactionType === 'TRANSFER',
        transactionType: parseResult.transactionType,
        category: parseResult.categoryMatch?.name,
      })

      setStatus('success')
      setStatusMsg('Transaction added!')
      setInput('')
      setParseResult(null)
      setShowPreview(false)
      onSuccess?.()

      setTimeout(() => {
        setStatus('idle')
        setStatusMsg('')
      }, 2000)
    } catch (err) {
      setStatus('error')
      setStatusMsg(String(err))
    }
  }

  // Handle SMS confirmation with optional PENDING status
  const handleSmsConfirm = async (asPending = false) => {
    if (!smsResult || !smsResult.amount) return

    cancelCountdown()

    // Find matching account and category
    let accountId = overrideAccountId
    let categoryId = overrideCategoryId

    // Use LLM suggestion if available and no override
    const suggestedAccountName = llmSuggestion?.accountName || smsResult.suggestions.accountName
    const suggestedCategoryName = llmSuggestion?.category || smsResult.suggestions.categoryName
    const suggestedSubCategory = overrideSubCategory || llmSuggestion?.subCategory

    if (!accountId && suggestedAccountName && accounts) {
      const matchedAccount = accounts.find(a =>
        a.name.toLowerCase().includes(suggestedAccountName.toLowerCase()) ||
        suggestedAccountName.toLowerCase().includes(a.name.toLowerCase())
      )
      accountId = matchedAccount?.id ?? null
    }

    if (!categoryId && suggestedCategoryName && categories) {
      const matchedCategory = categories.find(c =>
        c.name.toLowerCase() === suggestedCategoryName.toLowerCase()
      )
      categoryId = matchedCategory?.id ?? null
    }

    if (!accountId || accountId <= 0) {
      setStatus('error')
      setStatusMsg('Select an account')
      return
    }

    // Determine transaction type - use LLM suggestion if available
    const txType = llmSuggestion?.transactionType || smsResult.transactionType

    try {
      await createTransaction({
        fromAccountId: txType === 'EXPENSE' ? accountId : undefined,
        toAccountId: txType === 'INCOME' ? accountId : undefined,
        toCategoryId: categoryId && categoryId > 0 ? categoryId : undefined,
        amount: smsResult.amount,
        description: smsResult.merchantName || `SMS Transaction - ${smsResult.bankName || 'Unknown'}`,
        date: smsResult.date || new Date(),
        isTransfer: false,
        transactionType: txType,
        category: suggestedCategoryName || undefined,
        subCategory: suggestedSubCategory || undefined,
        smsRaw: smsResult.rawText,
        // Add status field for PENDING
        ...(asPending ? { status: 'PENDING' } : {}),
      })

      setStatus('success')
      setStatusMsg(asPending ? 'Added as PENDING!' : 'Transaction added!')
      setInput('')
      setSmsResult(null)
      setShowPreview(false)
      onSuccess?.()

      setTimeout(() => {
        setStatus('idle')
        setStatusMsg('')
      }, 2000)
    } catch (err) {
      setStatus('error')
      setStatusMsg(String(err))
    }
  }

  const handleClear = () => {
    setInput('')
    setParseResult(null)
    setSmsResult(null)
    setShowPreview(false)
    setStatus('idle')
    setStatusMsg('')
    setLlmSuggestion(null)
    setLlmError(null)
    setLlmProvider(null)
    setOverrideSubCategory(null)
    cancelCountdown()
  }

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
      setInputMode('sms') // Switch to SMS mode when pasting
    } catch (err) {
      setStatus('error')
      setStatusMsg('Could not read clipboard')
    }
  }

  const confidenceBadge = (conf: number) => {
    const pct = Math.round(conf * 100)
    const color = pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400'
    return <span className={`text-xs ${color}`}>{pct}%</span>
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setInputMode('quick')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            inputMode === 'quick'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Zap size={14} />
          Quick Add
        </button>
        <button
          onClick={() => setInputMode('sms')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            inputMode === 'sms'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare size={14} />
          SMS Parser
        </button>
        {inputMode === 'sms' && (
          <button
            onClick={handlePasteFromClipboard}
            className="ml-auto px-3 py-1.5 text-xs bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors"
          >
            Paste SMS
          </button>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-3">
        {inputMode === 'quick' ? (
          <Zap size={18} className="text-amber-400 flex-shrink-0" />
        ) : (
          <MessageSquare size={18} className="text-purple-400 flex-shrink-0" />
        )}
        {inputMode === 'sms' ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your bank SMS here..."
            rows={3}
            className="flex-1 bg-slate-900 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-slate-600 resize-none"
          />
        ) : (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && parseResult?.amount) handleConfirm()
            }}
            placeholder='Quick add: "200 chai DB" or "salary 50000 HDFC"'
            className="flex-1 bg-slate-900 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 border border-slate-600"
          />
        )}
        {input && (
          <button onClick={handleClear} className="p-1.5 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Countdown indicator */}
      {countdown !== null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg">
          <Clock size={16} className="text-amber-400 animate-pulse" />
          <span className="text-sm text-amber-300">
            Auto-submitting as PENDING in <strong>{countdown}</strong>s...
          </span>
          <button
            onClick={cancelCountdown}
            className="ml-auto px-2 py-1 text-xs bg-amber-700 text-white rounded hover:bg-amber-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Status message */}
      {status !== 'idle' && (
        <div className={`text-sm px-3 py-2 rounded ${status === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {statusMsg}
        </div>
      )}

      {/* Quick Add Parse preview */}
      {showPreview && parseResult && inputMode === 'quick' && (
        <div className="bg-slate-900/50 rounded-lg p-3 space-y-2 border border-slate-700">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Amount */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Amount:</span>
              {parseResult.amount ? (
                <span className="text-green-400 font-semibold">₹{parseResult.amount}</span>
              ) : (
                <span className="text-red-400 text-xs">Not found</span>
              )}
            </div>

            {/* Type */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Type:</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                parseResult.transactionType === 'INCOME' ? 'bg-green-900/50 text-green-400' :
                parseResult.transactionType === 'TRANSFER' ? 'bg-blue-900/50 text-blue-400' :
                'bg-red-900/50 text-red-400'
              }`}>
                {parseResult.transactionType}
              </span>
            </div>

            {/* Account */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Account:</span>
              {overrideAccountId !== null || parseResult.accountMatch ? (
                <div className="flex items-center gap-1">
                  <select
                    value={overrideAccountId ?? parseResult.accountMatch?.id ?? ''}
                    onChange={(e) => setOverrideAccountId(Number(e.target.value))}
                    className="bg-slate-800 text-white text-xs rounded px-2 py-1 border border-slate-600 max-w-[140px]"
                  >
                    {!overrideAccountId && parseResult.accountMatch && (
                      <option value={parseResult.accountMatch.id}>{parseResult.accountMatch.name}</option>
                    )}
                    {accounts?.filter((a) => a.id !== parseResult.accountMatch?.id).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {!overrideAccountId && parseResult.accountMatch && confidenceBadge(parseResult.accountMatch.confidence)}
                </div>
              ) : (
                <select
                  value=""
                  onChange={(e) => setOverrideAccountId(Number(e.target.value))}
                  className="bg-slate-800 text-slate-400 text-xs rounded px-2 py-1 border border-slate-600 max-w-[140px]"
                >
                  <option value="" disabled>Select account</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Category:</span>
              {overrideCategoryId !== null || parseResult.categoryMatch ? (
                <div className="flex items-center gap-1">
                  <select
                    value={overrideCategoryId ?? parseResult.categoryMatch?.id ?? ''}
                    onChange={(e) => setOverrideCategoryId(Number(e.target.value))}
                    className="bg-slate-800 text-white text-xs rounded px-2 py-1 border border-slate-600 max-w-[140px]"
                  >
                    {!overrideCategoryId && parseResult.categoryMatch && (
                      <option value={parseResult.categoryMatch.id}>{parseResult.categoryMatch.name}</option>
                    )}
                    {categories?.filter((c) => c.id !== parseResult.categoryMatch?.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {!overrideCategoryId && parseResult.categoryMatch && confidenceBadge(parseResult.categoryMatch.confidence)}
                </div>
              ) : (
                <select
                  value=""
                  onChange={(e) => setOverrideCategoryId(Number(e.target.value))}
                  className="bg-slate-800 text-slate-400 text-xs rounded px-2 py-1 border border-slate-600 max-w-[140px]"
                >
                  <option value="" disabled>Select category</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          {parseResult.description && (
            <div className="text-xs text-slate-400">
              Description: <span className="text-slate-300">{parseResult.description}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-600 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!parseResult.amount || loading}
              className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Check size={14} />
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </div>
      )}

      {/* SMS Parse preview */}
      {showPreview && smsResult && inputMode === 'sms' && (
        <div className="bg-slate-900/50 rounded-lg p-3 space-y-3 border border-purple-700/50">
          {/* AI Suggestion indicator */}
          {(llmLoading || llmSuggestion || llmError) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              llmLoading ? 'bg-blue-900/30 border border-blue-700/50' :
              llmSuggestion ? 'bg-emerald-900/30 border border-emerald-700/50' :
              'bg-red-900/30 border border-red-700/50'
            }`}>
              {llmLoading ? (
                <>
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                  <span className="text-xs text-blue-300">Getting AI suggestion...</span>
                </>
              ) : llmSuggestion ? (
                <>
                  <Sparkles size={14} className="text-emerald-400" />
                  <span className="text-xs text-emerald-300">
                    AI Suggestion via {llmProvider} ({llmSuggestion.confidence}% confident)
                  </span>
                  {llmSuggestion.reasoning && (
                    <span className="text-xs text-slate-400 ml-2 truncate max-w-[200px]" title={llmSuggestion.reasoning}>
                      - {llmSuggestion.reasoning}
                    </span>
                  )}
                </>
              ) : llmError ? (
                <>
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-xs text-red-300 truncate" title={llmError}>
                    AI: {llmError.length > 50 ? llmError.substring(0, 50) + '...' : llmError}
                  </span>
                </>
              ) : null}
            </div>
          )}

          {/* Confidence indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Parse Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    smsResult.confidence >= 70 ? 'bg-green-500' :
                    smsResult.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${smsResult.confidence}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${
                smsResult.confidence >= 70 ? 'text-green-400' :
                smsResult.confidence >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {smsResult.confidence}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Amount */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Amount:</span>
              {smsResult.amount ? (
                <span className="text-green-400 font-semibold">₹{smsResult.amount.toLocaleString('en-IN')}</span>
              ) : (
                <span className="text-red-400 text-xs">Not found</span>
              )}
            </div>

            {/* Type */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Type:</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                smsResult.transactionType === 'INCOME' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
              }`}>
                {smsResult.transactionType}
              </span>
            </div>

            {/* Bank */}
            {smsResult.bankName && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs w-16">Bank:</span>
                <span className="text-white text-xs">{smsResult.bankName}</span>
              </div>
            )}

            {/* Account Last 4 */}
            {smsResult.accountLast4 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs w-16">Account:</span>
                <span className="text-white text-xs">****{smsResult.accountLast4}</span>
              </div>
            )}

            {/* Merchant */}
            {smsResult.merchantName && (
              <div className="flex items-center gap-2 col-span-2">
                <span className="text-slate-400 text-xs w-16">Merchant:</span>
                <span className="text-white text-xs">{smsResult.merchantName}</span>
              </div>
            )}

            {/* Balance */}
            {smsResult.balance !== null && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs w-16">Balance:</span>
                <span className="text-blue-400 text-xs">₹{smsResult.balance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
            {/* Account Suggestion/Selection */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Account:</span>
              <select
                value={overrideAccountId ?? ''}
                onChange={(e) => setOverrideAccountId(Number(e.target.value))}
                className="bg-slate-800 text-white text-xs rounded px-2 py-1 border border-slate-600 flex-1"
              >
                <option value="" disabled>
                  {smsResult.suggestions.accountName || 'Select account'}
                </option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Category Suggestion/Selection */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs w-16">Category:</span>
              <select
                value={overrideCategoryId ?? ''}
                onChange={(e) => setOverrideCategoryId(Number(e.target.value))}
                className="bg-slate-800 text-white text-xs rounded px-2 py-1 border border-slate-600 flex-1"
              >
                <option value="" disabled>
                  {smsResult.suggestions.categoryName || 'Select category'}
                </option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-600 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSmsConfirm(true)}
              disabled={!smsResult.amount || loading}
              className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <AlertCircle size={14} />
              Add as Pending
            </button>
            <button
              onClick={() => handleSmsConfirm(false)}
              disabled={!smsResult.amount || loading}
              className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Check size={14} />
              {loading ? 'Adding...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MagicBox
