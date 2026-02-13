'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { parseSMS } from '@/lib/smsParser';
import { llmService } from '@/lib/llmService';
import { formatCurrency } from '@/lib/currency-utils';
import { Transaction, Account, Category } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export function AddTransactionModal({
  isOpen,
  onClose,
  editTransaction,
}: AddTransactionModalProps) {
  // Data from IndexedDB
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // SMS Parsing State
  const [smsText, setSmsText] = useState('');
  const [isParsingRegex, setIsParsingRegex] = useState(false);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [parseSource, setParseSource] = useState<'manual' | 'regex' | 'ai' | null>(null);

  // Form State
  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkedTransaction, setIsLinkedTransaction] = useState(false);
  const [linkedPersonAccountId, setLinkedPersonAccountId] = useState<string>('');

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    if (transactionType === 'TRANSFER') return [];
    const type = transactionType === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
    return categories.filter(c => c.type === type && !c.parentId);
  }, [categories, transactionType]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        // Editing existing transaction
        setTransactionType(editTransaction.transactionType);
        setAmount(editTransaction.amount.toString());
        setFromAccountId(editTransaction.fromAccountId?.toString() || '');
        setToAccountId(editTransaction.toAccountId?.toString() || '');
        setCategoryId(editTransaction.categoryId?.toString() || '');
        setDate(new Date(editTransaction.date).toISOString().slice(0, 16));
        setDescription(editTransaction.description || '');
        setParseSource(null);
      } else {
        // New transaction - reset form
        resetForm();
      }
    }
  }, [isOpen, editTransaction]);

  const resetForm = () => {
    setSmsText('');
    setTransactionType('EXPENSE');
    setAmount('');
    setFromAccountId('');
    setToAccountId('');
    setCategoryId('');
    setDate(new Date().toISOString().slice(0, 16));
    setDescription('');
    setParseSource(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // SMS PARSING - REGEX (Fast, Offline)
  // ═══════════════════════════════════════════════════════════════
  const handleParseRegex = () => {
    if (!smsText.trim()) {
      toast.error('Please paste SMS text first');
      return;
    }

    setIsParsingRegex(true);

    try {
      const result = parseSMS(smsText);

      if (result && result.confidence > 30) {
        applyParsedData(result, result.suggestions);
        setParseSource('regex');
        toast.success(`Parsed! Confidence: ${result.confidence}%`);
      } else {
        toast.error('Could not parse SMS with high confidence.');
      }
    } catch (error) {
      toast.error('Failed to parse SMS');
    } finally {
      setIsParsingRegex(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SMS PARSING - AI (Gemini → Claude → OpenAI)
  // ═══════════════════════════════════════════════════════════════
  const handleParseAI = async () => {
    if (!smsText.trim()) {
      toast.error('Please paste SMS text first');
      return;
    }

    // Check if any API key is configured
    const apiKeys = {
      gemini: localStorage.getItem('gemini_api_key'),
      claude: localStorage.getItem('claude_api_key'),
      openai: localStorage.getItem('openai_api_key'),
    };

    if (!apiKeys.gemini && !apiKeys.claude && !apiKeys.openai) {
      toast.error('No API keys configured. Go to Settings → API Keys');
      return;
    }

    setIsParsingAI(true);

    try {
      // Get recent transactions for context
      const recentTransactions = await db.transactions
        .orderBy('date')
        .reverse()
        .limit(20)
        .toArray();

      const result = await llmService.getSuggestion(smsText, {
        accounts,
        categories,
        recentTransactions,
      });

      if (result) {
        // Apply AI suggestions
        if (result.transactionType) {
          setTransactionType(result.transactionType as TransactionType);
        }
        if (result.amount) {
          setAmount(result.amount.toString());
        }
        if (result.accountName) {
          const account = accounts.find(a => 
            a.name.toLowerCase().includes(result.accountName!.toLowerCase())
          );
          if (account) {
            if (result.transactionType === 'EXPENSE' || result.transactionType === 'TRANSFER') {
              setFromAccountId(account.id!.toString());
            } else {
              setToAccountId(account.id!.toString());
            }
          }
        }
        if (result.categoryName) {
          const category = categories.find(c => 
            c.name.toLowerCase() === result.categoryName!.toLowerCase()
          );
          if (category) {
            setCategoryId(category.id!.toString());
          }
        }
        if (result.description) {
          setDescription(result.description);
        }

        setParseSource('ai');
        toast.success(`AI parsed! (${result.provider}, ${result.confidence}% confidence)`);
        
        if (result.reasoning) {
          console.log('AI Reasoning:', result.reasoning);
        }
      } else {
        toast.error('AI could not parse SMS');
      }
    } catch (error: any) {
      console.error('AI parsing failed:', error);
      toast.error(error.message || 'AI parsing failed');
    } finally {
      setIsParsingAI(false);
    }
  };

  // Apply parsed data to form
  const applyParsedData = (
    data: any,
    suggestions?: { accountName?: string; categoryName?: string }
  ) => {
    // Set transaction type
    if (data.transactionType) {
      setTransactionType(data.transactionType);
    }

    // Set amount
    if (data.amount) {
      setAmount(data.amount.toString());
    }

    // Set date
    if (data.date) {
      setDate(new Date(data.date).toISOString().slice(0, 16));
    }

    // Set description
    if (data.merchant) {
      setDescription(data.merchant);
    }

    // Apply account suggestion
    if (suggestions?.accountName) {
      const account = accounts.find(a => 
        a.name.toLowerCase().includes(suggestions.accountName!.toLowerCase())
      );
      if (account) {
        if (data.transactionType === 'EXPENSE') {
          setFromAccountId(account.id!.toString());
        } else if (data.transactionType === 'INCOME') {
          setToAccountId(account.id!.toString());
        }
      }
    }

    // Apply category suggestion
    if (suggestions?.categoryName) {
      const category = categories.find(c => 
        c.name.toLowerCase() === suggestions.categoryName!.toLowerCase()
      );
      if (category) {
        setCategoryId(category.id!.toString());
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SAVE TRANSACTION
  // ═══════════════════════════════════════════════════════════════
  const handleSave = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (transactionType === 'EXPENSE' && !fromAccountId) {
      toast.error('Please select an account');
      return;
    }
    if (transactionType === 'INCOME' && !toAccountId) {
      toast.error('Please select an account');
      return;
    }
    if (transactionType === 'TRANSFER' && (!fromAccountId || !toAccountId)) {
      toast.error('Please select both accounts for transfer');
      return;
    }
    if (transactionType === 'TRANSFER' && fromAccountId === toAccountId) {
      toast.error('Cannot transfer to the same account');
      return;
    }
    if ((transactionType === 'EXPENSE' || transactionType === 'INCOME') && !categoryId) {
      toast.error('Please select a category');
      return;
    }
    if (isLinkedTransaction && !linkedPersonAccountId) {
      toast.error('Please select a person for the linked transaction');
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      const amountValue = parseFloat(amount);

      if (editTransaction?.id) {
        // Update existing transaction
        // Note: Complex balance recalculation for edits is not implemented here.
        // This would require storing original values or deltas.
        const transactionData: Partial<Transaction> = {
          date: new Date(date).toISOString(),
          amount: amountValue,
          transactionType,
          fromAccountId: fromAccountId ? parseInt(fromAccountId) : undefined,
          toAccountId: toAccountId ? parseInt(toAccountId) : undefined,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          description: description.trim() || undefined,
          updatedAt: now,
        };
        await db.transactions.update(editTransaction.id, transactionData);
        toast.success('Transaction updated (balance not recalculated)');

      } else {
        // Create new transaction
        const mainTransactionId = await db.transactions.add({
          date: new Date(date).toISOString(),
          amount: amountValue,
          transactionType,
          fromAccountId: fromAccountId ? parseInt(fromAccountId) : undefined,
          toAccountId: toAccountId ? parseInt(toAccountId) : undefined,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          description: description.trim() || undefined,
          status: 'CONFIRMED',
          source: parseSource === 'ai' || parseSource === 'regex' ? 'MAGIC_BOX' : 'MANUAL',
          currency: 'INR',
          linkedTransactionId: undefined,
          createdAt: now,
          updatedAt: now,
        });

        // Update balances for non-linked transactions
        if (transactionType === 'EXPENSE' && fromAccountId) {
          await db.accounts.where('id').equals(parseInt(fromAccountId)).modify(a => { a.balance -= amountValue; });
        } else if (transactionType === 'INCOME' && toAccountId) {
          await db.accounts.where('id').equals(parseInt(toAccountId)).modify(a => { a.balance += amountValue; });
        } else if (transactionType === 'TRANSFER' && fromAccountId && toAccountId) {
          await db.accounts.where('id').equals(parseInt(fromAccountId)).modify(a => { a.balance -= amountValue; });
          await db.accounts.where('id').equals(parseInt(toAccountId)).modify(a => { a.balance += amountValue; });
        }

        // Handle linked transaction
        if (isLinkedTransaction && linkedPersonAccountId && transactionType === 'EXPENSE') {
          const linkedTransactionId = await db.transactions.add({
            date: new Date(date).toISOString(),
            amount: amountValue,
            transactionType: 'INCOME',
            toAccountId: parseInt(linkedPersonAccountId),
            description: `Linked: ${description || 'Payment on behalf'}`,
            status: 'CONFIRMED',
            source: 'MANUAL',
            currency: 'INR',
            linkedTransactionId: mainTransactionId,
            createdAt: now,
            updatedAt: now,
          });

          await db.transactions.update(mainTransactionId, { linkedTransactionId });
          await db.accounts.where('id').equals(parseInt(linkedPersonAccountId)).modify(a => { a.balance += amountValue; });
          
          toast.success('Transaction + linked receivable created!');
        } else {
          toast.success('Transaction saved!');
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      toast.error('Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER PREVIEW
  // ═══════════════════════════════════════════════════════════════
  const TransferPreview = () => {
    if (transactionType !== 'TRANSFER') return null;

    const from = accounts.find(a => a.id?.toString() === fromAccountId);
    const to = accounts.find(a => a.id?.toString() === toAccountId);
    const amountValue = parseFloat(amount) || 0;

    if (!from && !to) return null;

    const fromNewBalance = from ? from.balance - amountValue : 0;
    const toNewBalance = to ? to.balance + amountValue : 0;
    const fromBelowThreshold = from ? fromNewBalance < from.thresholdValue : false;

    return (
      <div className="bg-slate-700/50 rounded-lg p-4 my-4">
        <div className="text-sm text-slate-400 mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Transfer Preview
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* From Account */}
          <div className={`flex-1 text-center p-3 rounded-lg border ${
            fromBelowThreshold ? 'border-red-500 bg-red-500/10' : 'border-slate-600 bg-slate-800'
          }`}>
            <div className="text-xs text-slate-400">From</div>
            <div className="font-medium text-white">{from?.name || 'Select'}</div>
            {from && (
              <>
                <div className="text-sm text-slate-400">
                  {formatCurrency(from.balance)}
                </div>
                <div className="text-xs mt-1">↓</div>
                <div className={`text-sm font-medium ${
                  fromBelowThreshold ? 'text-red-400' : 'text-white'
                }`}>
                  {formatCurrency(fromNewBalance)}
                </div>
              </>
            )}
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-blue-400">
              {amountValue > 0 ? formatCurrency(amountValue) : '₹0'}
            </div>
            <ArrowRight className="w-8 h-8 text-blue-400" />
          </div>

          {/* To Account */}
          <div className="flex-1 text-center p-3 rounded-lg border border-slate-600 bg-slate-800">
            <div className="text-xs text-slate-400">To</div>
            <div className="font-medium text-white">{to?.name || 'Select'}</div>
            {to && (
              <>
                <div className="text-sm text-slate-400">
                  {formatCurrency(to.balance)}
                </div>
                <div className="text-xs mt-1">↓</div>
                <div className="text-sm font-medium text-green-400">
                  {formatCurrency(toNewBalance)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Warning */}
        {fromBelowThreshold && (
          <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {from?.name} will go below threshold!
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ═══════════════════════════════════════════════════════ */}
          {/* SMS PARSING SECTION */}
          {/* ═══════════════════════════════════════════════════════ */}
          {!editTransaction && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <label className="block text-sm text-slate-400 mb-2">
                📱 Paste Bank SMS (optional)
              </label>
              <Textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Paste your bank SMS here to auto-fill the form..."
                className="bg-slate-700/50 border-slate-600 text-white resize-none min-h-[80px]"
              />

              {/* Parse Buttons - Only show if SMS has text */}
              {smsText.trim() && (
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleParseRegex}
                    disabled={isParsingRegex || isParsingAI}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {isParsingRegex ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                    )}
                    Parse (Fast)
                  </Button>

                  <Button
                    onClick={handleParseAI}
                    disabled={isParsingRegex || isParsingAI}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    {isParsingAI ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Parse with AI
                  </Button>
                </div>
              )}

              {/* Parse Source Indicator */}
              {parseSource && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-slate-400">
                    Parsed using {parseSource === 'ai' ? 'AI' : 'regex patterns'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TRANSACTION TYPE */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Transaction Type
            </label>
            <div className="flex gap-2">
              {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTransactionType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    transactionType === type
                      ? type === 'EXPENSE'
                        ? 'bg-red-500 text-white'
                        : type === 'INCOME'
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type === 'EXPENSE' && <ArrowUpRight className="w-4 h-4 inline mr-1" />}
                  {type === 'INCOME' && <ArrowDownLeft className="w-4 h-4 inline mr-1" />}
                  {type === 'TRANSFER' && <RefreshCw className="w-4 h-4 inline mr-1" />}
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* AMOUNT */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="pl-8 bg-slate-700/50 border-slate-600 text-white text-lg"
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ACCOUNTS */}
          {/* ═══════════════════════════════════════════════════════ */}
          {(transactionType === 'EXPENSE' || transactionType === 'TRANSFER') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {transactionType === 'TRANSFER' ? 'From Account *' : 'Account *'}
              </label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {accounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id!.toString()}
                      className="text-white"
                    >
                      {account.name} ({formatCurrency(account.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(transactionType === 'INCOME' || transactionType === 'TRANSFER') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {transactionType === 'TRANSFER' ? 'To Account *' : 'Account *'}
              </label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {accounts
                    .filter(a => transactionType !== 'TRANSFER' || a.id?.toString() !== fromAccountId)
                    .map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id!.toString()}
                        className="text-white"
                      >
                        {account.name} ({formatCurrency(account.balance)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Transfer Preview */}
          <TransferPreview />

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CATEGORY (not for transfers) */}
          {/* ═══════════════════════════════════════════════════════ */}
          {transactionType !== 'TRANSFER' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Category *
              </label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {filteredCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id!.toString()}
                      className="text-white"
                    >
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* LINKED TRANSACTION (Only for Expense) */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {transactionType === 'EXPENSE' && (
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isLinked"
                  checked={isLinkedTransaction}
                  onChange={(e) => setIsLinkedTransaction(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-700 
                             text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="isLinked" className="text-sm text-slate-300">
                  This is a payment for someone (create linked transaction)
                </label>
              </div>
              
              {isLinkedTransaction && (
                <div className="mt-4 pl-7 space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Create receivable in *
                    </label>
                    <Select 
                      value={linkedPersonAccountId} 
                      onValueChange={setLinkedPersonAccountId}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue placeholder="Select person account" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {accounts
                          .filter(a => a.type === 'PERSON')
                          .map((account) => (
                            <SelectItem
                              key={account.id}
                              value={account.id!.toString()}
                              className="text-white"
                            >
                              👤 {account.name} ({formatCurrency(account.balance)})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Preview */}
                  {linkedPersonAccountId && (
                    <div className="bg-slate-800 rounded-lg p-3 text-sm">
                      <div className="text-slate-400 mb-2">Will create:</div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-red-400">1.</span>
                        <span>Expense from {accounts.find(a => a.id?.toString() === fromAccountId)?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300 mt-1">
                        <span className="text-green-400">2.</span>
                        <span>Receivable in {accounts.find(a => a.id?.toString() === linkedPersonAccountId)?.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* DATE & TIME */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Date & Time
            </label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white"
            />
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* NOTE */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Note (optional)
            </label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note..."
              className="bg-slate-700/50 border-slate-600 text-white"
            />
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ACTIONS */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 ${
                transactionType === 'EXPENSE'
                  ? 'bg-red-600 hover:bg-red-700'
                  : transactionType === 'INCOME'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editTransaction ? 'Update' : 'Save'} Transaction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
