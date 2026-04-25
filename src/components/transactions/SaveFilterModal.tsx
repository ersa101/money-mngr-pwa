'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '@/contexts/DbContext';
import type { FilterPreset } from '@/types/database';
import { Button } from '@/components/ui/button';
import { sortByName } from '@/lib/sortUtils';
import { useCleanCategories } from '@/hooks/useCleanCategories';
import { X, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current active filter state — used to pre-fill when creating a new preset
  initialValues: {
    searchText: string;
    accountId: string;        // string ID or ''
    transactionType: string;  // 'all' | 'EXPENSE' | 'INCOME' | 'TRANSFER'
    categoryId: string;       // string ID or ''
    subCategoryId: string;    // string ID or ''
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
  };
  // When set, modal is in edit mode for this preset
  editingPreset?: FilterPreset | null;
  // Called after successful save/update — parent can re-apply the preset
  onSaved: (preset: FilterPreset) => void;
}

export function SaveFilterModal({
  isOpen,
  onClose,
  initialValues,
  editingPreset,
  onSaved,
}: SaveFilterModalProps) {
  const db = useDb();
  const accounts = useLiveQuery(() => db?.accounts.toArray() ?? [], [db]) || [];
  const categories = useCleanCategories() || [];
  const existingPresets = useLiveQuery(() => db?.filterPresets.toArray() ?? [], [db]) || [];

  // Local form state
  const [name, setName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [accountId, setAccountId] = useState('');
  const [transactionType, setTransactionType] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [isBillingCycle, setIsBillingCycle] = useState(false);
  const [billingCycleOffset, setBillingCycleOffset] = useState(0); // 0 = current, 1 = previous
  const [isSaving, setIsSaving] = useState(false);

  // Subcategories filtered by the selected parent category
  const subCategories = useMemo(() => {
    if (!categoryId) return [];
    return categories.filter(c => c.parentId === parseInt(categoryId));
  }, [categories, categoryId]);

  // Top-level categories only
  const topCategories = useMemo(() => {
    return categories.filter(c => !c.parentId);
  }, [categories]);

  // Auto-extract start/end day from the date range for the billing cycle label
  const billingStartDay = dateFrom ? new Date(dateFrom + 'T00:00:00').getDate() : null;
  const billingEndDay = dateTo ? new Date(dateTo + 'T00:00:00').getDate() : null;
  const canShowBillingCheckbox = !!(dateFrom && dateTo);

  // Initialise form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (editingPreset) {
      // Edit mode: populate from existing preset
      setName(editingPreset.name);
      setSearchText(editingPreset.searchText || '');
      setAccountId(editingPreset.accountId?.toString() || '');
      setTransactionType(editingPreset.transactionType || 'all');
      setCategoryId(editingPreset.categoryId?.toString() || '');
      setSubCategoryId(editingPreset.subCategoryId?.toString() || '');
      setAmountMin(editingPreset.amountMin?.toString() || '');
      setAmountMax(editingPreset.amountMax?.toString() || '');

      // Resolve dates — if billing cycle, compute dates for display
      if (editingPreset.dateOffsetType?.startsWith('billing-')) {
        const match = editingPreset.dateOffsetType.match(/^billing-(\d+)-(\d+)(?:-(\d+))?$/);
        if (match) {
          const offset = match[3] ? parseInt(match[3]) : 0;
          const { from, to } = computeBillingDates(parseInt(match[1]), parseInt(match[2]), offset);
          setDateFrom(from);
          setDateTo(to);
          setIsBillingCycle(true);
          setBillingCycleOffset(offset);
        }
      } else {
        setDateFrom(editingPreset.dateOffsetStart || '');
        setDateTo(editingPreset.dateOffsetEnd || '');
        setIsBillingCycle(false);
      }
    } else {
      // Create mode: pre-fill from current active filter state
      setName('');
      setSearchText(initialValues.searchText);
      setAccountId(initialValues.accountId);
      setTransactionType(initialValues.transactionType);
      setCategoryId(initialValues.categoryId);
      setSubCategoryId(initialValues.subCategoryId);
      setDateFrom(initialValues.dateFrom);
      setDateTo(initialValues.dateTo);
      setAmountMin(initialValues.amountMin);
      setAmountMax(initialValues.amountMax);
      setIsBillingCycle(false);
      setBillingCycleOffset(0);
    }
  }, [isOpen, editingPreset]);

  // Clear subcategory when category changes
  useEffect(() => {
    setSubCategoryId('');
  }, [categoryId]);

  const handleOffsetChange = (offset: number) => {
    setBillingCycleOffset(offset);
    if (offset === 1 && name && !name.includes('(Prev)')) {
      setName(name.trim() + ' (Prev)');
    } else if (offset === 0 && name.endsWith(' (Prev)')) {
      setName(name.slice(0, -7));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Preset name is required');
      return;
    }

    // Uniqueness check
    const duplicate = existingPresets.find(
      p => p.name.trim().toLowerCase() === name.trim().toLowerCase() && p.id !== editingPreset?.id
    );
    if (duplicate) {
      toast.error(`A preset named "${name.trim()}" already exists`);
      return;
    }

    setIsSaving(true);
    try {
      // Build dateOffsetType
      let dateOffsetType: string | undefined;
      let dateOffsetStart: string | undefined;
      let dateOffsetEnd: string | undefined;

      if (dateFrom || dateTo) {
        if (isBillingCycle && billingStartDay && billingEndDay) {
          dateOffsetType = `billing-${billingStartDay}-${billingEndDay}-${billingCycleOffset}`;
          // No need to store actual dates — computed at apply-time
        } else {
          dateOffsetType = 'custom';
          dateOffsetStart = dateFrom || undefined;
          dateOffsetEnd = dateTo || undefined;
        }
      }

      const presetData: Omit<FilterPreset, 'id'> = {
        name: name.trim(),
        searchText: searchText.trim() || undefined,
        accountId: accountId ? parseInt(accountId) : undefined,
        transactionType: (transactionType !== 'all' ? transactionType as any : undefined),
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        subCategoryId: subCategoryId ? parseInt(subCategoryId) : undefined,
        dateOffsetType,
        dateOffsetStart,
        dateOffsetEnd,
        amountMin: amountMin ? parseFloat(amountMin) : undefined,
        amountMax: amountMax ? parseFloat(amountMax) : undefined,
        createdAt: editingPreset?.createdAt || new Date().toISOString(),
      };

      let savedPreset: FilterPreset;
      if (editingPreset?.id) {
        await db.filterPresets.update(editingPreset.id, presetData);
        savedPreset = { ...presetData, id: editingPreset.id };
        toast.success('Filter preset updated');
      } else {
        const newId = await db.filterPresets.add(presetData as FilterPreset);
        savedPreset = { ...presetData, id: newId as number };
        toast.success('Filter preset saved');
      }

      onSaved(savedPreset);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save preset');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">
              {editingPreset ? 'Edit Filter Preset' : 'Save Filter Preset'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Preset Name */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Preset Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. HDFC Billing, Groceries Jan"
              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
              autoFocus
            />
          </div>

          {/* Search Text */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Search Text</label>
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="e.g. HDFC, Swiggy"
              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Transaction Type</label>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTransactionType(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    transactionType === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t === 'all' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Account</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-purple-500 text-sm"
            >
              <option value="">All Accounts</option>
              {sortByName(accounts).map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-purple-500 text-sm"
            >
              <option value="">All Categories</option>
              {sortByName(topCategories).map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* SubCategory — only if a category with subcategories is selected */}
          {categoryId && subCategories.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">SubCategory</label>
              <select
                value={subCategoryId}
                onChange={e => setSubCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                <option value="">All SubCategories</option>
                {sortByName(subCategories).map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setIsBillingCycle(false); }}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setIsBillingCycle(false); }}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          </div>

          {/* Billing Cycle Checkbox */}
          {canShowBillingCheckbox && (
            <div className="bg-slate-800 rounded-lg p-3 space-y-2.5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="billingCycle"
                  checked={isBillingCycle}
                  onChange={e => { setIsBillingCycle(e.target.checked); if (!e.target.checked) setBillingCycleOffset(0); }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-500 cursor-pointer"
                />
                <div>
                  <label htmlFor="billingCycle" className="text-sm font-medium text-white cursor-pointer">
                    Repeat as billing cycle
                  </label>
                  {isBillingCycle && billingStartDay && billingEndDay ? (
                    <p className="text-xs text-purple-400 mt-0.5">
                      Every month: {billingStartDay}th → {billingEndDay}th (computed at apply-time)
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Auto-compute billing cycle dates each time you apply
                    </p>
                  )}
                </div>
              </div>

              {/* Which cycle — shown only when billing cycle is enabled */}
              {isBillingCycle && (
                <div className="pl-7">
                  <p className="text-xs text-slate-400 uppercase mb-1.5">Which cycle?</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="billingOffset"
                        checked={billingCycleOffset === 0}
                        onChange={() => handleOffsetChange(0)}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-sm text-white">Current</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="billingOffset"
                        checked={billingCycleOffset === 1}
                        onChange={() => handleOffsetChange(1)}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-sm text-white">Previous</span>
                    </label>
                  </div>
                  {billingCycleOffset === 1 && (
                    <p className="text-xs text-amber-400 mt-1">
                      Will filter one billing cycle back from the current one
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Min Amount</label>
              <input
                type="number"
                value={amountMin}
                onChange={e => setAmountMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Max Amount</label>
              <input
                type="number"
                value={amountMax}
                onChange={e => setAmountMax(e.target.value)}
                placeholder="No limit"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-700">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 bg-slate-700 text-white border-slate-500 hover:bg-slate-600"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? 'Saving...' : editingPreset ? 'Update Preset' : 'Save Preset'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Compute the actual calendar date range for a billing cycle (startDay → endDay).
 * offset=0 returns the current cycle; offset=1 shifts back one full cycle (previous).
 */
export function computeBillingDates(startDay: number, endDay: number, offset = 0): { from: string; to: string } {
  const today = new Date();
  const todayDay = today.getDate();

  let startDate: Date;
  let endDate: Date;

  if (todayDay <= endDay) {
    // Still within current cycle — started last month
    startDate = new Date(today.getFullYear(), today.getMonth() - 1 - offset, startDay);
    endDate = new Date(today.getFullYear(), today.getMonth() - offset, endDay);
  } else {
    // Past end day — new cycle started this month
    startDate = new Date(today.getFullYear(), today.getMonth() - offset, startDay);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1 - offset, endDay);
  }

  return {
    from: startDate.toISOString().split('T')[0],
    to: endDate.toISOString().split('T')[0],
  };
}
