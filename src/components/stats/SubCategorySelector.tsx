'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, ChevronRight } from 'lucide-react';
import type { Category } from '@/types/database';

interface SubCategorySelectorProps {
  subCategories: Category[];
  parentCategories: Category[];
  selected: Set<number>;
  onChange: (selected: Set<number>) => void;
}

export function SubCategorySelector({
  subCategories,
  parentCategories,
  selected,
  onChange,
}: SubCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build grouped structure
  const grouped = useMemo(() => {
    const filtered = search.trim()
      ? subCategories.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      : subCategories;

    const parentMap = new Map<number | undefined, Category[]>();
    filtered.forEach((s) => {
      const pid = s.parentId;
      if (!parentMap.has(pid)) parentMap.set(pid, []);
      parentMap.get(pid)!.push(s);
    });

    return parentMap;
  }, [subCategories, search]);

  const parentMap = useMemo(
    () => new Map(parentCategories.map((p) => [p.id!, p])),
    [parentCategories]
  );

  const label = useMemo(() => {
    if (selected.size === 0) return 'All Sub-Categories';
    if (selected.size === 1) {
      const cat = subCategories.find((s) => s.id && selected.has(s.id));
      return cat?.name ?? '1 selected';
    }
    return `${selected.size} selected`;
  }, [selected, subCategories]);

  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(subCategories.map((s) => s.id!)));
  const clearAll = () => onChange(new Set());

  const toggleGroup = (pid: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-sm text-slate-200 hover:border-slate-500 transition min-w-[180px]"
      >
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-80 max-h-[420px] flex flex-col rounded-xl border border-slate-600 bg-slate-900 shadow-2xl">
          {/* Search */}
          <div className="p-2 border-b border-slate-700 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search sub-categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-4 h-4 text-slate-500 hover:text-slate-300" />
              </button>
            )}
          </div>

          {/* Select / Clear all */}
          <div className="flex gap-2 px-3 py-2 border-b border-slate-700">
            <button
              onClick={selectAll}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              Select All
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-slate-300 transition"
            >
              Clear All
            </button>
          </div>

          {/* Groups */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {Array.from(grouped.entries()).map(([pid, items]) => {
              const parent = pid !== undefined ? parentMap.get(pid) : null;
              const isCollapsed = pid !== undefined && collapsed.has(pid);

              return (
                <div key={pid ?? 'ungrouped'}>
                  {parent && (
                    <button
                      onClick={() => toggleGroup(pid!)}
                      className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-300"
                    >
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      />
                      {parent.icon} {parent.name}
                    </button>
                  )}
                  {!isCollapsed &&
                    items.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={cat.id !== undefined && selected.has(cat.id)}
                          onChange={() => cat.id && toggleOne(cat.id)}
                          className="accent-blue-500 w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-sm text-slate-200">
                          {cat.icon} {cat.name}
                        </span>
                      </label>
                    ))}
                </div>
              );
            })}
            {grouped.size === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No matches</p>
            )}
          </div>

          {/* Apply */}
          <div className="p-2 border-t border-slate-700">
            <button
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
