import React, { useCallback, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { ManualBlock, ManualChapter, USER_MANUAL } from '../data/userManual';

const BLOCK_TEXT = 'text-[13px] leading-relaxed text-slate-600 dark:text-slate-300';
const TABLE_HEAD =
  'text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

const ManualTable: React.FC<{ block: Extract<ManualBlock, { kind: 'table' }> }> = ({ block }) => (
  <div className="space-y-1.5">
    {block.title && (
      <h4 className="font-display text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {block.title}
      </h4>
    )}
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
        <thead className="bg-slate-50 dark:bg-slate-900/60">
          <tr>
            {block.columns.map((col) => (
              <th key={col} scope="col" className={`px-3 py-2 border-b border-slate-200 dark:border-slate-800 ${TABLE_HEAD}`}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-transparent dark:even:bg-slate-900/30"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className={`px-3 py-2 align-top border-b border-slate-100 dark:border-slate-800/70 ${
                    cellIdx === 0
                      ? 'font-medium text-slate-800 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ManualBlockView: React.FC<{ block: ManualBlock }> = ({ block }) => {
  switch (block.kind) {
    case 'p':
      return <p className={`max-w-3xl ${BLOCK_TEXT}`}>{block.text}</p>;

    case 'bullets':
      return (
        <ul className={`list-disc pl-5 space-y-1 ${BLOCK_TEXT}`}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case 'defs':
      return (
        <dl className="grid gap-2 sm:grid-cols-2">
          {block.items.map((item) => (
            <div
              key={item.term}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2"
            >
              <dt className="font-display text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">
                {item.term}
              </dt>
              <dd className="mt-0.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                {item.description}
              </dd>
            </div>
          ))}
        </dl>
      );

    case 'callout':
      return (
        <div className="rounded-lg border-l-2 border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 px-3.5 py-2.5">
          <p className="font-display text-[12.5px] font-semibold text-blue-800 dark:text-blue-200">
            {block.title}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
            {block.body}
          </p>
        </div>
      );

    case 'figure':
      return (
        <figure className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3.5 py-3">
          <figcaption className="font-display text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {block.title}
          </figcaption>
          <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-violet-400 via-slate-300 to-blue-600 dark:from-violet-500 dark:via-slate-600 dark:to-blue-500" />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {block.marks.map((mark) => (
              <div key={mark.label} className="text-center">
                <div className="font-mono-tabular text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                  {mark.note}
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400">{mark.label}</div>
              </div>
            ))}
          </div>
          {block.caption && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{block.caption}</p>
          )}
        </figure>
      );

    case 'chips':
      return (
        <div className="space-y-1.5">
          <h4 className={TABLE_HEAD}>{block.title}</h4>
          <div className="flex flex-wrap gap-1.5">
            {block.items.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 text-[11.5px] text-slate-700 dark:text-slate-200"
              >
                {item.label}
                <span className="font-mono-tabular rounded bg-white dark:bg-slate-800 px-1 text-[10.5px] font-semibold text-blue-700 dark:text-blue-300">
                  {item.value}
                </span>
              </span>
            ))}
          </div>
        </div>
      );

    case 'table':
      return <ManualTable block={block} />;
  }
};

const ManualChapterView: React.FC<{
  chapter: ManualChapter;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ chapter, isOpen, onToggle }) => (
  <section
    id={chapter.id}
    className="scroll-mt-24 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
  >
    <h3>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${chapter.id}-body`}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left bg-slate-50/80 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
      >
        <span className="font-mono-tabular text-[11px] font-semibold text-blue-600 dark:text-blue-400">
          {chapter.number}
        </span>
        <span className="flex-1 font-display text-[13.5px] font-semibold text-slate-900 dark:text-white">
          {chapter.title}
        </span>
        <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400">{chapter.readTime}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
    </h3>

    {isOpen && (
      <div id={`${chapter.id}-body`} className="px-3.5 py-3.5 space-y-3.5">
        <p className="max-w-3xl text-[12.5px] font-medium leading-relaxed text-slate-700 dark:text-slate-200">
          {chapter.lead}
        </p>
        {chapter.blocks.map((block, idx) => (
          <ManualBlockView key={idx} block={block} />
        ))}
      </div>
    )}
  </section>
);

const LOCAL_MANUAL_OPEN_KEY = 'groovesheet_manual_open';

export const UserManual: React.FC = () => {
  const [manualOpen, setManualOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCAL_MANUAL_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [openChapterId, setOpenChapterId] = useState<string | null>(USER_MANUAL.chapters[0]?.id ?? null);

  const toggleManual = useCallback(() => {
    setManualOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LOCAL_MANUAL_OPEN_KEY, String(next));
      } catch {
        // ignore storage failures (private mode, quota)
      }
      return next;
    });
  }, []);

  const jumpToChapter = useCallback((chapterId: string) => {
    setManualOpen(true);
    try {
      localStorage.setItem(LOCAL_MANUAL_OPEN_KEY, 'true');
    } catch {
      // ignore storage failures
    }
    setOpenChapterId(chapterId);
    requestAnimationFrame(() => {
      document.getElementById(chapterId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  return (
    <section
      id="user-manual"
      className="no-print bg-(--studio-surface) border-b border-(--studio-border)"
      aria-labelledby="user-manual-heading"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        {/* Compact reference strip — collapsed by default so the studio stays in view */}
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <h2
              id="user-manual-heading"
              className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
            >
              User Manual
            </h2>
            <span className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {USER_MANUAL.edition}
            </span>
            <span className="hidden lg:inline truncate text-[11.5px] text-slate-500 dark:text-slate-400">
              {USER_MANUAL.subtitle}
              <span aria-hidden="true"> · </span>
              Creator: {USER_MANUAL.creator}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleManual}
              aria-expanded={manualOpen}
              aria-controls="user-manual-body"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11.5px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${manualOpen ? 'rotate-180' : ''}`}
              />
              {manualOpen ? 'Hide' : 'Read manual'}
            </button>
          </div>
        </div>

        {manualOpen && (
          <div id="user-manual-body" className="pb-4 space-y-4">
            <p className="max-w-3xl text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              {USER_MANUAL.intro}
            </p>

            <nav aria-label="Manual contents" className="space-y-1.5">
              <h3 className={TABLE_HEAD}>Contents</h3>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {USER_MANUAL.chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => jumpToChapter(chapter.id)}
                    className="flex items-baseline gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-2.5 py-1.5 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-colors"
                  >
                    <span className="font-mono-tabular text-[10.5px] font-semibold text-blue-600 dark:text-blue-400">
                      {chapter.number}
                    </span>
                    <span className="text-[11.5px] font-medium leading-snug text-slate-700 dark:text-slate-200">
                      {chapter.title}
                    </span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="space-y-2">
              {USER_MANUAL.chapters.map((chapter) => (
                <ManualChapterView
                  key={chapter.id}
                  chapter={chapter}
                  isOpen={openChapterId === chapter.id}
                  onToggle={() =>
                    setOpenChapterId((current) => (current === chapter.id ? null : chapter.id))
                  }
                />
              ))}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {USER_MANUAL.title} — {USER_MANUAL.subtitle} · {USER_MANUAL.edition} ·{' '}
              <a
                href={USER_MANUAL.appUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:underline underline-offset-2"
              >
                {USER_MANUAL.appUrl}
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
