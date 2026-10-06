'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  /** Shorter text for the closed field, when `label` is too long to fit. */
  display?: string;
  /** Options sharing a group render under one heading, in first-seen order. */
  group?: string;
}

// A search-bar field (icon, small label, bold value) that opens its own
// listbox BELOW the field. A native <select> lets the browser decide the
// direction, and with the bar near the bottom of the viewport it opened
// upward over the hero - so this is a custom listbox instead, following
// the WAI-ARIA listbox pattern: arrow keys / Home / End / type-ahead to
// move, Enter or Space to pick, Escape to close.
export default function SearchDropdown({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', at: 0 });

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    setActive(selectedIndex);
    listRef.current?.focus({ preventScroll: true });
    // Bring the whole panel into view when the bar sits low on the screen.
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  function pick(index: number) {
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onListKeyDown(e: KeyboardEvent) {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') setActive((a) => Math.min(last, a + 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(last);
    else if (e.key === 'Enter' || e.key === ' ') pick(active);
    else if (e.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 700 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
      t.at = now;
      const match = options.findIndex((o) => o.label.replace(/^\P{L}+/u, '').toLowerCase().startsWith(t.text));
      if (match >= 0) setActive(match);
      return;
    } else return;
    e.preventDefault();
  }

  // Interleave group headings with the options they introduce.
  const rows: ({ kind: 'heading'; text: string } | { kind: 'option'; index: number })[] = [];
  let lastGroup: string | undefined;
  options.forEach((o, index) => {
    if (o.group && o.group !== lastGroup) rows.push({ kind: 'heading', text: o.group });
    lastGroup = o.group;
    rows.push({ kind: 'option', index });
  });

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${selected?.label ?? ''}`}
        className={`w-full flex items-center gap-3 px-5 py-3 md:py-2 text-left rounded-xl md:rounded-2xl transition-colors ${
          open ? 'bg-muted/70' : 'hover:bg-muted/60'
        }`}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground leading-tight">{label}</span>
          <span className="block text-[15px] font-semibold text-navy truncate leading-snug">{selected?.display ?? selected?.label}</span>
        </span>
        <ChevronDown size={16} className={`text-navy/60 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKeyDown}
          className="absolute left-0 top-full mt-3 z-50 w-full md:w-[340px] max-h-[min(380px,60vh)] overflow-y-auto overscroll-contain bg-card border border-border rounded-xl shadow-lift py-1.5 outline-none scroll-mb-4"
        >
          {rows.map((row) =>
            row.kind === 'heading' ? (
              <li
                key={`h-${row.text}`}
                role="presentation"
                className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {row.text}
              </li>
            ) : (
              <li
                key={options[row.index].value || '__all'}
                id={`${id}-opt-${row.index}`}
                role="option"
                aria-selected={row.index === selectedIndex}
                // mousemove, not mouseenter: keyboard scrolling slides rows under a
                // resting pointer, which must not steal the keyboard highlight.
                onMouseMove={() => active !== row.index && setActive(row.index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(row.index)}
                className={`flex items-center justify-between gap-3 px-4 py-2 text-sm cursor-pointer ${
                  row.index === active ? 'bg-primary/10 text-primary' : 'text-foreground'
                } ${row.index === selectedIndex ? 'font-semibold' : ''}`}
              >
                <span className="truncate">{options[row.index].label}</span>
                {row.index === selectedIndex && <Check size={15} className="text-primary shrink-0" />}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
