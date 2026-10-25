'use client';
import { useState } from 'react';
import {
  Plus,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Search,
  Archive,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { Button, Empty, IconButton } from '@/components/ui';
import { type Category, type Topic, type Workspace } from '@/lib/models';
export function Library({
  data,
  categoryId,
  onOpen,
  onCreate,
  onCategory,
  onEditTopic,
  onEditCategory,
}: {
  data: Workspace;
  categoryId: string;
  onOpen: (id: string) => void;
  onCreate: (categoryId?: string, parent?: Topic) => void;
  onCategory: () => void;
  onEditTopic: (topic: Topic) => void;
  onEditCategory: (category: Category) => void;
}) {
  const [filter, setFilter] = useState(''),
    [archived, setArchived] = useState(false),
    [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const cats = data.categories.filter(
    (c) => (!categoryId || c.id === categoryId) && (archived || !c.archived),
  );
  const matches = (t: Topic) =>
    !filter ||
    `${t.title} ${data.documents.find((d) => d.id === t.id)?.text || ''} ${data.resources
      .filter((r) => r.topicId === t.id)
      .map((r) => r.title)
      .join(' ')}`
      .toLowerCase()
      .includes(filter.toLowerCase());
  const renderTopic = (t: Topic, depth = 0): React.ReactNode => {
    const children = data.topics.filter(
      (child) => child.parentTopicId === t.id && (archived || !child.archived),
    );
    return (
      <div key={t.id}>
        <div
          className="library-topic-row"
          style={{ paddingLeft: `${Math.min(depth, 10) * 24 + 16}px` }}
        >
          {children.length > 0 ? (
            <IconButton label={`Toggle ${t.title} subtopics`} onClick={() => toggle(t.id)}>
              {expanded.has(t.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </IconButton>
          ) : (
            <span className="topic-tree-spacer">
              <FileText size={14} />
            </span>
          )}
          <button className="library-topic-name" onClick={() => onOpen(t.id)}>
            <strong>{t.title}</strong>
            {t.archived && <span className="archived-label">Archived</span>}
            <small>
              {data.documents.find((d) => d.id === t.id)?.text.slice(0, 70) ||
                'A little space for your next discovery.'}
            </small>
          </button>
          <span className={`status-pill ${t.status}`}>
            <span />
            {t.status === 'todo' ? 'To do' : t.status === 'learning' ? 'Learning' : 'Done'}
          </span>
          <span className="topic-updated">
            {new Date(t.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <IconButton
            label={`Add subtopic to ${t.title}`}
            onClick={() => onCreate(t.categoryId, t)}
          >
            <Plus size={15} />
          </IconButton>
          <IconButton label={`Edit ${t.title}`} onClick={() => onEditTopic(t)}>
            <MoreHorizontal size={17} />
          </IconButton>
        </div>
        {expanded.has(t.id) &&
          (depth < 10 ? (
            children.map((child) => renderTopic(child, depth + 1))
          ) : (
            <button className="depth-link" onClick={() => onOpen(t.id)}>
              Open topic to explore {children.length} deeper subtopics <ArrowUpRight size={14} />
            </button>
          ))}
      </div>
    );
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A HOME FOR YOUR CURIOSITY</span>
          <h1>Your knowledge, connected.</h1>
          <p>Big ideas. Small discoveries. Room for all of it.</p>
        </div>
        <Button onClick={() => onCreate(categoryId || undefined)}>
          <Plus size={16} />
          New topic
        </Button>
      </div>
      <div className="library-toolbar">
        <div className="inline-search">
          <Search size={16} />
          <input
            aria-label="Filter library"
            placeholder="Find a topic, note, or resource…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div>
          <button
            className={`subtle-button ${archived ? 'selected' : ''}`}
            onClick={() => setArchived(!archived)}
          >
            <Archive size={15} />
            {archived ? 'Showing archived' : 'Show archived'}
          </button>
          <Button secondary onClick={onCategory}>
            <Plus size={14} />
            New category
          </Button>
        </div>
      </div>
      {cats.length === 0 ? (
        <Empty
          icon={<FolderOpen size={28} />}
          title="A new corner of your universe."
          description="Create a category to start connecting what you learn."
          action={<Button onClick={onCategory}>Create category</Button>}
        />
      ) : (
        cats.map((c) => {
          const all = data.topics.filter((t) => t.categoryId === c.id && (archived || !t.archived)),
            visible = filter ? all.filter(matches) : all.filter((t) => !t.parentTopicId);
          return (
            <section className="library-category" key={c.id}>
              <header>
                <div>
                  <span
                    className="category-square"
                    style={{ background: `${c.color}19`, color: c.color }}
                  >
                    <FolderOpen size={17} />
                  </span>
                  <h2>{c.title}</h2>
                  <span className="count-badge">{all.length}</span>
                  {c.archived && <span className="archived-label">Archived category</span>}
                </div>
                <div>
                  <IconButton label={`Add topic to ${c.title}`} onClick={() => onCreate(c.id)}>
                    <Plus size={17} />
                  </IconButton>
                  <IconButton label={`Edit category ${c.title}`} onClick={() => onEditCategory(c)}>
                    <MoreHorizontal size={18} />
                  </IconButton>
                </div>
              </header>
              {visible.length ? (
                visible.map((t) =>
                  filter ? (
                    <div className="library-topic-row" key={t.id}>
                      <FileText size={15} />
                      <button className="library-topic-name" onClick={() => onOpen(t.id)}>
                        <strong>{t.title}</strong>
                        <small>
                          {data.documents.find((d) => d.id === t.id)?.text.slice(0, 110)}
                        </small>
                      </button>
                      <ArrowUpRight size={15} />
                    </div>
                  ) : (
                    renderTopic(t)
                  ),
                )
              ) : (
                <div className="category-empty">
                  <p>
                    {filter
                      ? 'No matching topics in this category.'
                      : 'Every area of knowledge begins with a question.'}
                  </p>
                  {!filter && (
                    <button className="text-link" onClick={() => onCreate(c.id)}>
                      Add your first topic <Plus size={14} />
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
