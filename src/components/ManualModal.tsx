import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MANUAL_CHAPTER_LINKS, MANUAL_PAGES } from '../data/manualPages';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_BUTTON =
  'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border whitespace-nowrap transition-colors';

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  const total = MANUAL_PAGES.length;
  const [pageIndex, setPageIndex] = useState(0);

  const goToPage = useCallback(
    (nextIndex: number) => {
      setPageIndex(Math.max(0, Math.min(total - 1, nextIndex)));
    },
    [total]
  );

  // Always reopen on the cover
  useEffect(() => {
    if (isOpen) setPageIndex(0);
  }, [isOpen]);

  // Lock page scroll while the handbook is open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Keyboard paging: ← / →, PageUp / PageDown, Home / End, Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          setPageIndex((current) => Math.min(total - 1, current + 1));
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          setPageIndex((current) => Math.max(0, current - 1));
          break;
        case 'Home':
          event.preventDefault();
          setPageIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setPageIndex(total - 1);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, total]);

  // Warm the neighbouring page images for instant flipping
  useEffect(() => {
    if (!isOpen) return;
    [pageIndex - 1, pageIndex + 1].forEach((index) => {
      const neighbour = MANUAL_PAGES[index];
      if (neighbour) {
        const img = new Image();
        img.src = neighbour.image;
      }
    });
  }, [isOpen, pageIndex]);

  const page = MANUAL_PAGES[pageIndex];
  const currentChapter = useMemo(() => {
    let active = MANUAL_CHAPTER_LINKS[0];
    for (const link of MANUAL_CHAPTER_LINKS) {
      if (link.page <= pageIndex + 1) active = link;
    }
    return active;
  }, [pageIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-4xl max-h-[94vh] overflow-hidden rounded-xl border border-(--studio-border) bg-(--studio-surface) text-slate-900 dark:text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 border-b border-(--studio-border) shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-blue-600 dark:text-blue-400 m-0">
              Reference Manual · {total} pages
            </p>
            <h2 id="manual-title" className="font-display text-lg font-bold m-0 truncate">
              GrooveSheet Handbook
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close manual"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chapter shortcuts */}
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-(--studio-border) shrink-0">
          {MANUAL_CHAPTER_LINKS.map((link) => {
            const isActive = link === currentChapter;
            return (
              <button
                key={link.number}
                type="button"
                onClick={() => goToPage(link.page - 1)}
                aria-current={isActive ? 'page' : undefined}
                className={`${PAGE_BUTTON} ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`font-mono-tabular text-[9.5px] ${isActive ? 'text-white/80' : 'text-blue-600 dark:text-blue-400'}`}>
                  {link.number}
                </span>
                {link.label}
              </button>
            );
          })}
        </div>

        {/* Page canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-3 sm:p-5">
          <img
            key={page.page}
            src={page.image}
            alt={`Manual page ${page.page} of ${total}: ${page.title}`}
            className="block w-full max-w-[880px] mx-auto bg-white shadow-lg ring-1 ring-black/10 rounded-sm"
            draggable={false}
          />
        </div>

        {/* Footer pager */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-(--studio-border) shrink-0">
          <button
            type="button"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="text-center min-w-0">
            <p className="text-[11.5px] text-slate-600 dark:text-slate-300 m-0 truncate" aria-live="polite">
              Page {String(page.page).padStart(2, '0')} / {total} · {page.title}
            </p>
            <p className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 m-0">
              Use ← / → or the shortcuts above to flip pages
            </p>
          </div>

          <button
            type="button"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={pageIndex === total - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
