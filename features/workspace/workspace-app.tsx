'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, MotionConfig } from 'motion/react';
import {
  Orbit,
  ListTodo,
  LibraryBig,
  CalendarDays,
  ChartNoAxesCombined,
  Settings2,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Menu,
  X,
  HardDrive,
} from 'lucide-react';
import { repository, db } from '@/lib/db';
import { loadDemoData } from '@/lib/demo-data';
import { useWorkspace } from '@/lib/use-workspace';
import { useUI, report } from '@/lib/store';
import type { Category, Topic } from '@/lib/models';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button, IconButton, Loading, Toast } from '@/components/ui';
import { TopicDialog, CategoryDialog } from './dialogs';
import { TaskHome } from '@/features/tasks/task-home';
import { Library } from './library';
import { Planner } from './planner';
import { Progress } from './progress';
import { Settings } from './settings';
import { TopicWorkspace } from './topic-workspace';
import { FocusTimer } from './focus-timer';
import { SearchPalette } from './search-palette';
const nav = [
  { id: 'dashboard', label: 'My day', icon: ListTodo },
  { id: 'library', label: 'Learning library', icon: LibraryBig },
  { id: 'planner', label: 'Routine planner', icon: CalendarDays },
  { id: 'progress', label: 'Your progress', icon: ChartNoAxesCombined },
];
function WorkspaceInner({
  initialView,
  initialTopic,
}: {
  initialView: string;
  initialTopic?: string;
}) {
  const router = useRouter(),
    params = useSearchParams(),
    data = useWorkspace(),
    [ready, setReady] = useState(false),
    [initError, setInitError] = useState(''),
    [topicDialog, setTopicDialog] = useState<{
      topic?: Topic;
      parent?: Topic;
      categoryId?: string;
    } | null>(null),
    [categoryDialog, setCategoryDialog] = useState<Category | 'new' | null>(null),
    [expanded, setExpanded] = useState<Set<string>>(new Set()),
    search = useUI((s) => s.search),
    setSearch = useUI((s) => s.setSearch),
    sidebar = useUI((s) => s.sidebar),
    setSidebar = useUI((s) => s.setSidebar);
  const categoryId = params.get('category') || '';
  useEffect(() => {
    void repository
      .initialize()
      .then(() => loadDemoData())
      .then(() => setReady(true))
      .catch((e) => {
        setInitError(e instanceof Error ? e.message : 'Storage unavailable');
      });
  }, []);
  const navigate = useCallback(
    (view: string) => {
      window.dispatchEvent(new Event('orbit:flush'));
      router.push(view === 'dashboard' ? '/' : `/${view}`);
      setSidebar(false);
    },
    [router, setSidebar],
  );
  const openTopic = useCallback(
    (id: string) => {
      window.dispatchEvent(new Event('orbit:flush'));
      void db.topics.update(id, { openedAt: Date.now() }).catch(report);
      router.push(`/topic/${id}`);
      setSidebar(false);
    },
    [router, setSidebar],
  );
  const openCategory = useCallback(
    (id: string) => {
      window.dispatchEvent(new Event('orbit:flush'));
      router.push(`/library?category=${id}`);
      setSidebar(false);
    },
    [router, setSidebar],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch(!useUI.getState().search);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearch]);
  const createTopic = (categoryId?: string, parent?: Topic) => {
    setTopicDialog({ categoryId, parent });
  };
  if (initError)
    return (
      <main className="error-page">
        <Orbit size={38} />
        <h1>Your workspace needs browser storage.</h1>
        <p>{initError}</p>
        <p>Allow IndexedDB in your browser and reopen ORBIT.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  if (!ready || !data) return <Loading />;
  const recent = [...data.topics]
    .filter((t) => !t.archived)
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, 3);
  const title =
    initialView === 'topic'
      ? 'Learning workspace'
      : nav.find((n) => n.id === initialView)?.label || 'Workspace settings';
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        {sidebar && (
          <button
            className="sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setSidebar(false)}
          />
        )}
        <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
          <div className="brand-row">
            <button className="brand" onClick={() => navigate('dashboard')} aria-label="ORBIT home">
              <span className="brand-symbol">
                <Orbit size={27} strokeWidth={1.3} />
              </span>
              <strong>
                ORBIT<span>®</span>
              </strong>
            </button>
            <IconButton
              label="Close sidebar"
              className="mobile-only"
              onClick={() => setSidebar(false)}
            >
              <X size={18} />
            </IconButton>
          </div>
          <div className="workspace-label">
            <span className="workspace-avatar">
              M<span />
            </span>
            <div>
              <strong>My workspace</strong>
              <span>A little space to grow</span>
            </div>
            <span className="workspace-mode">LOCAL</span>
          </div>
          <button className="sidebar-search" onClick={() => setSearch(true)}>
            <Search size={15} />
            <span>Find anything</span>
            <kbd>⌘ K</kbd>
          </button>
          <span className="nav-eyebrow">YOUR WORKSPACE</span>
          <nav className="main-navigation" aria-label="Main navigation">
            {nav.map((n) => (
              <button
                key={n.id}
                className={
                  initialView === n.id || (n.id === 'library' && initialView === 'topic')
                    ? 'active'
                    : ''
                }
                onClick={() => navigate(n.id)}
                aria-current={initialView === n.id ? 'page' : undefined}
                aria-label={n.label}
              >
                <n.icon size={17} />
                <span>{n.label}</span>
                {initialView === n.id && <span className="nav-active-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-section-title">
            <span>YOUR UNIVERSE</span>
            <IconButton label="Create category" onClick={() => setCategoryDialog('new')}>
              <Plus size={15} />
            </IconButton>
          </div>
          <div className="sidebar-categories">
            {data.categories
              .filter((c) => !c.archived)
              .map((c) => (
                <div key={c.id}>
                  <div className={`sidebar-category ${categoryId === c.id ? 'selected' : ''}`}>
                    <button
                      className="category-expander"
                      aria-label={`Expand ${c.title}`}
                      onClick={() =>
                        setExpanded((old) => {
                          const next = new Set(old);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        })
                      }
                    >
                      {expanded.has(c.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <button className="category-nav-name" onClick={() => openCategory(c.id)}>
                      <span style={{ background: c.color }} />
                      {c.title}
                    </button>
                    <small>
                      {data.topics.filter((t) => t.categoryId === c.id && !t.archived).length}
                    </small>
                  </div>
                  {expanded.has(c.id) && (
                    <div className="sidebar-topic-children">
                      {data.topics
                        .filter((t) => t.categoryId === c.id && !t.parentTopicId && !t.archived)
                        .slice(0, 15)
                        .map((t) => (
                          <button
                            className={initialTopic === t.id ? 'active' : ''}
                            key={t.id}
                            onClick={() => openTopic(t.id)}
                          >
                            {t.title}
                          </button>
                        ))}
                      <button className="add-sidebar-topic" onClick={() => createTopic(c.id)}>
                        <Plus size={12} />
                        Add a topic
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
          {recent.length > 0 && (
            <div className="sidebar-recents">
              <span className="nav-eyebrow">RECENTLY EXPLORED</span>
              {recent.map((t) => (
                <button key={t.id} onClick={() => openTopic(t.id)}>
                  <span className="recent-dot" />
                  {t.title}
                </button>
              ))}
            </div>
          )}
          <div className="sidebar-bottom">
            <div className="local-card">
              <span className="local-card-icon">
                <HardDrive size={17} />
              </span>
              <div>
                <strong>Only here. Only yours.</strong>
                <p>Saved on this device.</p>
              </div>
              <span className="status-dot" />
            </div>
            <button
              className={`sidebar-settings ${initialView === 'settings' ? 'active' : ''}`}
              onClick={() => navigate('settings')}
            >
              <Settings2 size={16} />
              <span>Workspace settings</span>
              <ArrowUpRight size={14} />
            </button>
            <div className="sidebar-bottom-note">
              <span className="tiny-dot" />A SPACE FOR YOUR NEXT CHAPTER
            </div>
          </div>
        </aside>
        <div className="app-main">
          <header className="topbar">
            <div>
              <IconButton
                label="Open navigation"
                className="mobile-only"
                onClick={() => setSidebar(true)}
              >
                <Menu size={20} />
              </IconButton>
              <span className="topbar-workspace">Workspace</span>
              <ChevronRight size={12} />
              <span>{initialView === 'dashboard' ? 'My day' : title}</span>
            </div>
            <div>
              <span className="local-indicator">
                <span className="status-dot" />
                All changes stay local
              </span>
              <span className="topbar-divider" />
              <ThemeSwitcher />
              <IconButton label="Search workspace" onClick={() => setSearch(true)}>
                <Search size={17} />
              </IconButton>
              <button
                className="profile-badge"
                aria-label="Open workspace settings"
                onClick={() => navigate('settings')}
              >
                M
              </button>
            </div>
          </header>
          <motion.main
            key={`${initialView}-${initialTopic || ''}-${categoryId}`}
            className={`main-content ${initialView === 'topic' ? 'topic-content' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {initialView === 'dashboard' && <TaskHome data={data} />}
            {initialView === 'library' && (
              <Library
                data={data}
                categoryId={categoryId}
                onOpen={openTopic}
                onCreate={createTopic}
                onCategory={() => setCategoryDialog('new')}
                onEditTopic={(t) => setTopicDialog({ topic: t })}
                onEditCategory={setCategoryDialog}
              />
            )}
            {initialView === 'topic' && initialTopic && (
              <TopicWorkspace
                data={data}
                id={initialTopic}
                onOpen={openTopic}
                onLibrary={(id) => (id ? openCategory(id) : navigate('library'))}
                onCreate={(parent) => createTopic(parent.categoryId, parent)}
                onEdit={(topic) => setTopicDialog({ topic })}
              />
            )}
            {initialView === 'planner' && <Planner data={data} onOpen={openTopic} />}
            {initialView === 'progress' && <Progress data={data} onOpen={openTopic} />}
            {initialView === 'settings' && <Settings data={data} />}
          </motion.main>
        </div>
        <FocusTimer topics={data.topics} onOpen={openTopic} />
        <Toast />
        {topicDialog && (
          <TopicDialog
            data={data}
            {...topicDialog}
            onClose={() => setTopicDialog(null)}
            onCreated={openTopic}
          />
        )}
        {categoryDialog && (
          <CategoryDialog
            category={categoryDialog === 'new' ? undefined : categoryDialog}
            onClose={() => setCategoryDialog(null)}
          />
        )}
        {search && (
          <SearchPalette
            data={data}
            onClose={() => setSearch(false)}
            onOpen={openTopic}
            onNavigate={navigate}
          />
        )}
      </div>
    </MotionConfig>
  );
}
export function WorkspaceApp(props: { initialView: string; initialTopic?: string }) {
  return (
    <Suspense fallback={<Loading />}>
      <WorkspaceInner {...props} />
    </Suspense>
  );
}
