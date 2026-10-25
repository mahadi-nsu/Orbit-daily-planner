'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ChevronRight,
  Play,
  Plus,
  MoreHorizontal,
  ArrowUpRight,
  ArrowLeft,
  BookOpen,
  Clock3,
  CalendarDays,
  FileText,
  Layers3,
} from 'lucide-react';
import { Button, Empty, IconButton } from '@/components/ui';
import { db } from '@/lib/db';
import { readableTime, type Topic, type Workspace, type Status } from '@/lib/models';
import { report } from '@/lib/store';
import { ResourceList } from './resources';
import { StartFocus } from './focus-timer';
const LearningEditor = dynamic(
  () => import('@/features/editor/learning-editor').then((m) => m.LearningEditor),
  { ssr: false, loading: () => <div className="editor-loading">Opening your notes…</div> },
);
export function TopicWorkspace({
  data,
  id,
  onOpen,
  onLibrary,
  onCreate,
  onEdit,
}: {
  data: Workspace;
  id: string;
  onOpen: (id: string) => void;
  onLibrary: (categoryId?: string) => void;
  onCreate: (parent: Topic) => void;
  onEdit: (topic: Topic) => void;
}) {
  const [focus, setFocus] = useState(false);
  const topic = data.topics.find((t) => t.id === id);
  if (!topic)
    return (
      <Empty
        icon={<FileText size={28} />}
        title="This page is waiting for a topic."
        description="The topic may have been removed or belongs to a different browser workspace."
        action={<Button onClick={() => onLibrary()}>Back to your library</Button>}
      />
    );
  const category = data.categories.find((c) => c.id === topic.categoryId),
    children = data.topics.filter((t) => t.parentTopicId === id && !t.archived),
    siblings = data.topics.filter(
      (t) =>
        t.parentTopicId === topic.parentTopicId &&
        t.categoryId === topic.categoryId &&
        t.id !== id &&
        !t.archived,
    ),
    document = data.documents.find((d) => d.id === id),
    resources = data.resources.filter((r) => r.topicId === id),
    history = data.studies
      .filter((s) => s.topicId === id)
      .sort((a, b) => b.startedAt - a.startedAt),
    scheduled = data.scheduled
      .filter((s) => s.topicId === id)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const ancestors: Topic[] = [];
  let current = topic.parentTopicId;
  const visited = new Set([topic.id]);
  while (current && !visited.has(current)) {
    visited.add(current);
    const parent = data.topics.find((t) => t.id === current);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent.parentTopicId;
  }
  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <button onClick={() => onLibrary()}>Library</button>
        <ChevronRight size={12} />
        <button onClick={() => onLibrary(category?.id)}>{category?.title}</button>
        {ancestors.map((a) => (
          <span key={a.id}>
            <ChevronRight size={12} />
            <button onClick={() => onOpen(a.id)}>{a.title}</button>
          </span>
        ))}
        <ChevronRight size={12} />
        <span className="current-crumb">{topic.title}</span>
      </nav>
      <header className="topic-header">
        <div>
          <span className="category-tag" style={{ color: category?.color }}>
            <span />
            {category?.title.toUpperCase()}
          </span>
          <h1>{topic.title}</h1>
          <div className="topic-metadata">
            <span>
              <Clock3 size={12} />
              Updated{' '}
              {new Date(topic.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span>{children.length} subtopics</span>
            <span>{resources.length} resources</span>
            {topic.archived && <span>Archived</span>}
          </div>
        </div>
        <div className="topic-header-actions">
          <select
            aria-label="Topic status"
            className={`status-select ${topic.status}`}
            value={topic.status}
            onChange={(e) =>
              void db.topics
                .update(id, { status: e.target.value as Status, updatedAt: Date.now() })
                .catch(report)
            }
          >
            <option value="todo">○ To do</option>
            <option value="learning">◐ Learning</option>
            <option value="done">● Done</option>
          </select>
          <Button onClick={() => setFocus(true)}>
            <Play size={14} />
            Start focus
          </Button>
          <IconButton label="Topic settings" onClick={() => onEdit(topic)}>
            <MoreHorizontal size={20} />
          </IconButton>
        </div>
      </header>
      <div className="topic-layout">
        <div className="topic-main">
          <div className="notes-label">
            <BookOpen size={14} />
            <span>YOUR LEARNING NOTES</span>
            <span className="notes-shortcut">Make room for the details.</span>
          </div>
          {document && <LearningEditor key={id} topicId={id} initialContent={document.content} />}
          <ResourceList topicId={id} resources={resources} />
          <div className="sibling-navigation">
            {topic.parentTopicId ? (
              <button onClick={() => onOpen(topic.parentTopicId!)}>
                <ArrowLeft size={14} />
                Back to parent topic
              </button>
            ) : (
              <button onClick={() => onLibrary(topic.categoryId)}>
                <ArrowLeft size={14} />
                Back to {category?.title}
              </button>
            )}
            {siblings[0] && (
              <button onClick={() => onOpen(siblings[0].id)}>
                {siblings[0].title}
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </div>
        <aside className="topic-aside">
          <section>
            <div className="aside-title">
              <h3>
                <Layers3 size={14} />
                Explore deeper
              </h3>
              <IconButton label="Create subtopic" onClick={() => onCreate(topic)}>
                <Plus size={16} />
              </IconButton>
            </div>
            {children.length ? (
              children.map((t) => (
                <button className="subtopic-link" key={t.id} onClick={() => onOpen(t.id)}>
                  <span className={`small-status ${t.status}`} />
                  <span>{t.title}</span>
                  <ChevronRight size={13} />
                </button>
              ))
            ) : (
              <div className="aside-empty">
                <p>Big topics become clearer in smaller pieces.</p>
                <button className="text-link" onClick={() => onCreate(topic)}>
                  Add a subtopic
                  <Plus size={13} />
                </button>
              </div>
            )}
          </section>
          <section>
            <div className="aside-title">
              <h3>
                <Clock3 size={14} />
                Time well spent
              </h3>
            </div>
            <strong className="topic-hours">
              {(history.reduce((sum, s) => sum + s.duration, 0) / 3600).toFixed(1)}
              <small>hours of focus</small>
            </strong>
            {history.length ? (
              history.slice(0, 8).map((s) => (
                <div className="study-history" key={s.id}>
                  <span>
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                    <strong>{readableTime(s.duration)}</strong>
                  </span>
                  {s.note && <p>{s.note}</p>}
                </div>
              ))
            ) : (
              <p className="aside-caption">Your focus sessions will find a home here.</p>
            )}
          </section>
          {scheduled.length > 0 && (
            <section>
              <div className="aside-title">
                <h3>
                  <CalendarDays size={14} />
                  In your routine
                </h3>
              </div>
              {scheduled.map((s) => (
                <div className="scheduled-note" key={s.id}>
                  <span>
                    {new Date(`${s.date}T12:00`).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {s.time}
                  </span>
                  <small>
                    {s.duration} min{s.completed ? ' · Completed' : ''}
                  </small>
                </div>
              ))}
            </section>
          )}
          <div className="local-note">
            <span className="status-dot" />
            <p>
              Your ideas stay with you.
              <br />
              Saved locally in this browser.
            </p>
          </div>
        </aside>
      </div>
      {focus && <StartFocus topicId={id} onClose={() => setFocus(false)} />}
    </>
  );
}
