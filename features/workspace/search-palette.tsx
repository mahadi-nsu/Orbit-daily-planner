'use client';
import { useMemo, useState } from 'react';
import { Search, ArrowUpRight, FileText, CornerDownLeft } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { Workspace } from '@/lib/models';
export function SearchPalette({
  data,
  onClose,
  onOpen,
  onNavigate,
}: {
  data: Workspace;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNavigate: (view: string) => void;
}) {
  const [query, setQuery] = useState(''),
    [active, setActive] = useState(0);
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return data.topics
      .map((t) => {
        const doc = data.documents.find((d) => d.id === t.id),
          resources = data.resources.filter((r) => r.topicId === t.id),
          titleMatch = t.title.toLowerCase().includes(q),
          match =
            titleMatch ||
            doc?.text.toLowerCase().includes(q) ||
            resources.some((r) => r.title.toLowerCase().includes(q));
        return {
          topic: t,
          match,
          score: titleMatch ? 2 : 1,
          text: doc?.text || 'Open topic workspace',
        };
      })
      .filter((r) => r.match)
      .sort((a, b) => (query ? b.score - a.score : b.topic.openedAt - a.topic.openedAt))
      .slice(0, 30);
  }, [data, query]);
  return (
    <Modal title="Find your next thought" onClose={onClose} wide>
      <div className="command-input">
        <Search size={20} />
        <input
          autoFocus
          value={query}
          placeholder="Search topics, notes, and resources…"
          aria-label="Search workspace"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter' && results[active]) {
              onOpen(results[active].topic.id);
              onClose();
            }
          }}
        />
        <kbd>ESC</kbd>
      </div>
      <div className="command-results" role="listbox" aria-label="Search results">
        <span className="eyebrow">{query ? 'SEARCH RESULTS' : 'RECENTLY EXPLORED'}</span>
        {results.map((r, i) => (
          <button
            role="option"
            aria-selected={active === i}
            className={active === i ? 'selected' : ''}
            key={r.topic.id}
            onMouseEnter={() => setActive(i)}
            onClick={() => {
              onOpen(r.topic.id);
              onClose();
            }}
          >
            <FileText size={18} />
            <span>
              <strong>
                {r.topic.title}
                {r.topic.archived && <small> · Archived</small>}
              </strong>
              <small>
                {data.categories.find((c) => c.id === r.topic.categoryId)?.title} ·{' '}
                {r.text.slice(0, 110)}
              </small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {results.length === 0 && (
          <div className="search-empty">
            <Search size={24} />
            <p>
              {query
                ? 'No matching thoughts yet. Try another word.'
                : 'Your topics will appear here as your library grows.'}
            </p>
          </div>
        )}
      </div>
      {!query && (
        <div className="command-shortcuts">
          {[
            ['dashboard', 'My day'],
            ['library', 'Learning library'],
            ['planner', 'Routine planner'],
            ['settings', 'Backup & settings'],
          ].map(([view, label]) => (
            <button
              key={view}
              onClick={() => {
                onNavigate(view);
                onClose();
              }}
            >
              {label}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
      )}
      <footer className="command-footer">
        <span>↑ ↓ to navigate</span>
        <span>
          <CornerDownLeft size={12} />
          to open
        </span>
        <span>Searches all your saved notes</span>
      </footer>
    </Modal>
  );
}
