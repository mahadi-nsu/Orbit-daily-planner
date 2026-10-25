'use client';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import {
  Plus,
  CalendarDays,
  Clock3,
  Check,
  MoreHorizontal,
  Copy,
  Trash2,
  Pencil,
  ArrowUpRight,
  Target,
  BookOpen,
} from 'lucide-react';
import { Button, Modal, Field, Empty, IconButton, Confirm } from '@/components/ui';
import {
  addDays,
  localDate,
  COLORS,
  type Category,
  type Routine,
  type RoutineTarget,
  type RoutineItem,
  type TaskStatus,
  type Workspace,
} from '@/lib/models';
import { hoursLabel, routineFocusMinutes } from '@/lib/routine-plan';
import { repository, uid } from '@/lib/db';
import { report } from '@/lib/store';

const labels: Record<TaskStatus, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
};
function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function RoutineDialog({
  routine,
  onClose,
  onSaved,
}: {
  routine?: Routine;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [title, setTitle] = useState(routine?.title || 'My learning week');
  const [startDate, setStartDate] = useState(routine?.startDate || localDate());
  const [days, setDays] = useState(routine?.days || 7);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={routine ? 'Edit routine' : 'Plan your learning week'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            onSaved(await repository.saveRoutine({ title, startDate, days }, routine?.id));
            onClose();
          } catch (error) {
            report(error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Routine name">
          <input
            autoFocus
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Start date">
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field
          label="Duration"
          hint="Set hour targets for this whole period. Study whenever it suits you."
        >
          <div className="segmented">
            {[7, 14, 30].map((n) => (
              <button
                type="button"
                key={n}
                className={days === n ? 'selected' : ''}
                onClick={() => setDays(n)}
              >
                {n === 7 ? '1 week' : n === 14 ? '2 weeks' : '30 days'}
              </button>
            ))}
          </div>
          <input
            type="number"
            aria-label="Custom routine days"
            required
            min={1}
            max={3650}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </Field>
        <div className="form-actions">
          <Button secondary type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !title.trim()}>
            {busy ? 'Saving…' : routine ? 'Save routine' : 'Create routine'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TargetDialog({
  data,
  routine,
  target,
  onClose,
}: {
  data: Workspace;
  routine: Routine;
  target?: RoutineTarget;
  onClose: () => void;
}) {
  const category = data.categories.find((c) => !c.archived);
  const [categoryId, setCategoryId] = useState(
    target ? target.categoryId || '' : category?.id || '',
  );
  const [title, setTitle] = useState(target?.title || category?.title || '');
  const [hours, setHours] = useState(target ? target.targetMinutes / 60 : 4);
  const [busy, setBusy] = useState(false);
  const [addingArea, setAddingArea] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaColor, setAreaColor] = useState(COLORS[0]);
  const [creatingArea, setCreatingArea] = useState(false);
  const [createdAreas, setCreatedAreas] = useState<Category[]>([]);
  const areaSelect = useRef<HTMLSelectElement>(null);
  const areas = [
    ...new Map([...createdAreas, ...data.categories].map((area) => [area.id, area])).values(),
  ];
  const addArea = async () => {
    const name = areaName.trim();
    if (busy || creatingArea || !name) return;
    setCreatingArea(true);
    try {
      let area = areas.find(
        (area) => !area.archived && area.title.toLowerCase() === name.toLowerCase(),
      );
      if (!area) {
        const id = await repository.createCategory(name, areaColor);
        area = { id, title: name, color: areaColor, order: areas.length, archived: false };
        setCreatedAreas((current) => [...current, area!]);
      }
      if (!title.trim() || title === areas.find((current) => current.id === categoryId)?.title)
        setTitle(area.title);
      setCategoryId(area.id);
      setAreaName('');
      setAddingArea(false);
      requestAnimationFrame(() => areaSelect.current?.focus());
    } catch (error) {
      report(error);
    } finally {
      setCreatingArea(false);
    }
  };
  return (
    <Modal title={target ? 'Edit learning target' : 'What will you focus on?'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await repository.saveRoutineTarget(routine.id, {
              id: target?.id || uid(),
              title,
              categoryId: categoryId || null,
              targetMinutes: Math.round(hours * 60),
              items: target?.items || [],
            });
            onClose();
          } catch (error) {
            report(error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Learning area">
          <select
            ref={areaSelect}
            value={categoryId}
            disabled={busy || addingArea || creatingArea}
            onChange={(e) => {
              const value = e.target.value;
              setCategoryId(value);
              if (value) setTitle(areas.find((c) => c.id === value)?.title || '');
            }}
          >
            <option value="">Custom area</option>
            {areas
              .filter((c) => !c.archived || c.id === target?.categoryId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
          {!addingArea && (
            <button
              type="button"
              className="topic-create-option"
              disabled={busy}
              onClick={() => setAddingArea(true)}
            >
              <Plus size={13} />
              New learning area
            </button>
          )}
          {addingArea && (
            <section className="topic-inline-create" aria-label="New learning area">
              <Field
                label="New learning area name"
                hint="Also available as a category in your learning library."
              >
                <input
                  autoFocus
                  maxLength={200}
                  placeholder="e.g. System design"
                  value={areaName}
                  disabled={creatingArea}
                  onChange={(e) => setAreaName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void addArea();
                    }
                  }}
                />
              </Field>
              <div className="color-options" role="group" aria-label="Learning area color">
                {COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    aria-label={`Choose ${color}`}
                    aria-pressed={areaColor === color}
                    disabled={creatingArea}
                    style={{ background: color }}
                    onClick={() => setAreaColor(color)}
                  >
                    {areaColor === color ? '✓' : ''}
                  </button>
                ))}
              </div>
              <div className="topic-inline-actions">
                <Button
                  secondary
                  type="button"
                  disabled={creatingArea}
                  onClick={() => {
                    setAddingArea(false);
                    setAreaName('');
                    requestAnimationFrame(() => areaSelect.current?.focus());
                  }}
                >
                  Cancel area
                </Button>
                <Button
                  type="button"
                  disabled={creatingArea || !areaName.trim()}
                  onClick={() => void addArea()}
                >
                  {creatingArea ? 'Adding…' : 'Add learning area'}
                </Button>
              </div>
            </section>
          )}
        </Field>
        <Field label="Target name">
          <input
            autoFocus
            required
            maxLength={200}
            placeholder="Frontend, Backend, AI…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field
          label="Target hours"
          hint="Your time budget for this routine, not a fixed daily timetable."
        >
          <input
            type="number"
            required
            min={0.25}
            max={1000}
            step="any"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </Field>
        <div className="form-actions">
          <Button secondary type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || creatingArea || addingArea || !title.trim()}>
            {busy ? 'Saving…' : target ? 'Save target' : 'Add target'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ItemDialog({
  data,
  routine,
  target,
  item,
  onClose,
}: {
  data: Workspace;
  routine: Routine;
  target: RoutineTarget;
  item: RoutineItem;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [topicId, setTopicId] = useState(item.topicId || '');
  const [status, setStatus] = useState(item.status);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Edit study topic" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await repository.saveRoutineItem(routine.id, target.id, {
              ...item,
              title,
              topicId: topicId || null,
              status,
            });
            onClose();
          } catch (error) {
            report(error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="What will you study?">
          <input
            autoFocus
            required
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field
          label="Link learning notes"
          hint="Optional. A linked topic opens its notes and contributes saved focus time."
        >
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">No link — just a checklist item</option>
            {data.topics
              .filter((t) => !t.archived || t.id === item.topicId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {data.categories.find((c) => c.id === t.categoryId)?.title} / {t.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Study status">
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-actions">
          <Button secondary type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !title.trim()}>
            {busy ? 'Saving…' : 'Save study topic'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StudyItem({
  routine,
  target,
  item,
  onEdit,
  onOpen,
}: {
  routine: Routine;
  target: RoutineTarget;
  item: RoutineItem;
  onEdit: () => void;
  onOpen: (id: string) => void;
}) {
  const [pending, setPending] = useState<TaskStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = pending ?? item.status;
  useEffect(() => {
    if (item.status === pending) setPending(null);
  }, [item.status, pending]);
  const changeStatus = async (status: TaskStatus) => {
    setPending(status);
    setBusy(true);
    try {
      await repository.saveRoutineItem(routine.id, target.id, { ...item, status });
    } catch (error) {
      setPending(null);
      report(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className={`routine-study-item ${status === 'done' ? 'is-done' : ''}`}>
      <label className="task-checkbox">
        <input
          type="checkbox"
          disabled={busy}
          checked={status === 'done'}
          aria-label={`${status === 'done' ? 'Reopen' : 'Complete'} study topic: ${item.title}`}
          onChange={(e) => void changeStatus(e.target.checked ? 'done' : 'todo')}
        />
        <span aria-hidden="true">{status === 'done' && <Check size={14} />}</span>
      </label>
      <button
        className="routine-item-title"
        onClick={onEdit}
        aria-label={`Edit study topic: ${item.title}`}
      >
        <strong>{item.title}</strong>
        {item.topicId && (
          <small>
            <BookOpen size={11} />
            Linked learning notes
          </small>
        )}
      </button>
      {item.topicId && (
        <IconButton label={`Open notes: ${item.title}`} onClick={() => onOpen(item.topicId!)}>
          <ArrowUpRight size={16} />
        </IconButton>
      )}
      <select
        className={`task-status ${status}`}
        aria-label={`Study status for ${item.title}`}
        value={status}
        disabled={busy}
        onChange={(e) => void changeStatus(e.target.value as TaskStatus)}
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <IconButton label={`Remove study topic: ${item.title}`} onClick={() => setDeleting(true)}>
        <Trash2 size={14} />
      </IconButton>
      {deleting && (
        <Confirm
          title="Remove this study topic?"
          description="This only removes the item from this routine. Your learning notes and focus history stay saved."
          action="Remove study topic"
          onClose={() => setDeleting(false)}
          onConfirm={() => repository.removeRoutineItem(routine.id, target.id, item.id)}
        />
      )}
    </li>
  );
}

function TargetCard({
  data,
  routine,
  target,
  focusedMinutes,
  onEdit,
  onOpen,
}: {
  data: Workspace;
  routine: Routine;
  target: RoutineTarget;
  focusedMinutes: number;
  onEdit: () => void;
  onOpen: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const complete = target.items.filter((i) => i.status === 'done').length;
  const color = data.categories.find((c) => c.id === target.categoryId)?.color || 'var(--violet)';
  const progress = Math.min(100, (focusedMinutes / target.targetMinutes) * 100);
  const available = data.topics.filter(
    (t) =>
      !t.archived &&
      (!target.categoryId || t.categoryId === target.categoryId) &&
      !target.items.some((i) => i.topicId === t.id),
  );
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await repository.saveRoutineItem(routine.id, target.id, {
        id: uid(),
        title,
        topicId: topicId || null,
        status: 'todo',
      });
      setTitle('');
      setTopicId('');
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="routine-target-card"
      aria-label={`${target.title} target`}
      style={{ '--target-color': color } as CSSProperties}
    >
      <header className="routine-target-heading">
        <div className="routine-target-name">
          <span className="routine-target-mark">
            <Target size={19} />
          </span>
          <div>
            <h2>{target.title}</h2>
            <p>
              {target.items.length} study topics <span>·</span> {complete} complete
            </p>
          </div>
        </div>
        <div className="routine-target-budget">
          <strong>{hoursLabel(target.targetMinutes)}</strong>
          <span>target</span>
        </div>
        <IconButton label={`Edit target: ${target.title}`} onClick={onEdit}>
          <Pencil size={15} />
        </IconButton>
        <IconButton label={`Remove target: ${target.title}`} onClick={() => setDeleting(true)}>
          <Trash2 size={15} />
        </IconButton>
      </header>
      <div className="routine-target-progress">
        <div>
          <span>
            <Clock3 size={12} />
            {hoursLabel(focusedMinutes)} focused
          </span>
          <span>{hoursLabel(target.targetMinutes)} target</span>
        </div>
        <div
          className="routine-hours-track"
          role="progressbar"
          aria-label={`Focus time for ${target.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${hoursLabel(focusedMinutes)} of ${hoursLabel(target.targetMinutes)} focused`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      {target.items.length ? (
        <ul className="routine-study-list" aria-label={`${target.title} study topics`}>
          {target.items.map((item) => (
            <StudyItem
              key={item.id}
              routine={routine}
              target={target}
              item={item}
              onEdit={() => setEditingItem(item)}
              onOpen={onOpen}
            />
          ))}
        </ul>
      ) : (
        <p className="routine-target-empty">
          What will you study? Add a topic below, or pick one from your library.
        </p>
      )}
      <form className="routine-item-composer" onSubmit={add}>
        <div>
          <Plus size={17} />
          <input
            aria-label={`New study topic for ${target.title}`}
            required
            maxLength={300}
            placeholder={`What will you study in ${target.title}?`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTopicId('');
            }}
          />
          <Button type="submit" aria-label="Add topic" secondary disabled={busy || !title.trim()}>
            <Plus size={14} />
            <span>Add topic</span>
          </Button>
        </div>
        {available.length > 0 && (
          <label>
            <BookOpen size={12} />
            <select
              aria-label={`Choose library topic for ${target.title}`}
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setTitle(available.find((t) => t.id === e.target.value)?.title || '');
              }}
            >
              <option value="">Or choose from your learning library</option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </form>
      {editingItem && (
        <ItemDialog
          data={data}
          routine={routine}
          target={target}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      {deleting && (
        <Confirm
          title={`Remove ${target.title} target?`}
          description="The target and its routine checklist will be removed. Your library, notes, and focus history stay saved."
          action="Remove target"
          onClose={() => setDeleting(false)}
          onConfirm={() => repository.removeRoutineTarget(routine.id, target.id)}
        />
      )}
    </section>
  );
}

export function Planner({ data, onOpen }: { data: Workspace; onOpen: (id: string) => void }) {
  const [selected, setSelected] = useState('');
  const [routineDialog, setRoutineDialog] = useState<'new' | 'edit' | null>(null);
  const [targetDialog, setTargetDialog] = useState<RoutineTarget | 'new' | null>(null);
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);
  const routine = data.routines.find((r) => r.id === selected) || data.routines[0];
  const targets = routine?.targets || [];
  const items = targets.flatMap((t) => t.items);
  const totalMinutes = targets.reduce((sum, t) => sum + t.targetMinutes, 0);
  const focused = routine ? routineFocusMinutes(routine, data.studies) : new Map<string, number>();
  const totalFocused = [...focused.values()].reduce((sum, minutes) => sum + minutes, 0);
  return (
    <div className="routine-plan">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A WEEK WITH INTENTION</span>
          <h1>Your learning plan.</h1>
          <p>Choose your focus. Set the hours. Know what to study next.</p>
        </div>
        <Button onClick={() => setRoutineDialog('new')}>
          <Plus size={16} />
          New routine
        </Button>
      </div>
      {!routine ? (
        <Empty
          icon={<Target size={27} />}
          title="What do you want to learn this week?"
          description="Set a target like Frontend — 4 hours, then list the topics you want to cover. Add Backend, AI, or any area you want to make time for."
          action={
            <Button onClick={() => setRoutineDialog('new')}>
              Create your first routine
              <Plus size={16} />
            </Button>
          }
        />
      ) : (
        <>
          <div className="routine-plan-toolbar">
            <div className="routine-selector">
              <select
                aria-label="Select routine"
                value={routine.id}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setMenu(false);
                }}
              >
                {data.routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <span>
                <CalendarDays size={12} />
                {dateLabel(routine.startDate)} –{' '}
                {dateLabel(addDays(routine.startDate, routine.days - 1))}
                <span>·</span>
                {routine.days} days
              </span>
            </div>
            <div className="routine-plan-actions">
              <div className="menu-anchor">
                <IconButton label="Routine options" onClick={() => setMenu(!menu)}>
                  <MoreHorizontal size={19} />
                </IconButton>
                {menu && (
                  <div className="dropdown">
                    <button
                      onClick={() => {
                        setRoutineDialog('edit');
                        setMenu(false);
                      }}
                    >
                      <Pencil size={15} />
                      Edit routine
                    </button>
                    <button
                      disabled={copying}
                      onClick={async () => {
                        setCopying(true);
                        try {
                          const id = await repository.duplicateRoutine(routine.id);
                          if (id) setSelected(id);
                          setMenu(false);
                        } catch (error) {
                          report(error);
                        } finally {
                          setCopying(false);
                        }
                      }}
                    >
                      <Copy size={15} />
                      {copying ? 'Copying…' : 'Duplicate routine'}
                    </button>
                    <button
                      className="text-danger"
                      onClick={() => {
                        setDeleting(true);
                        setMenu(false);
                      }}
                    >
                      <Trash2 size={15} />
                      Delete routine
                    </button>
                  </div>
                )}
              </div>
              <Button onClick={() => setTargetDialog('new')}>
                <Plus size={15} />
                Add learning target
              </Button>
            </div>
          </div>
          {targets.length > 0 && (
            <div className="routine-plan-summary">
              <div>
                <Target size={17} />
                <span>
                  <strong>{targets.length}</strong> learning areas
                </span>
              </div>
              <div>
                <Clock3 size={17} />
                <span>
                  <strong>{hoursLabel(totalMinutes)}</strong> planned{' '}
                  <small>· {hoursLabel(totalFocused)} focused</small>
                </span>
              </div>
              <div>
                <Check size={17} />
                <span>
                  <strong>
                    {items.filter((i) => i.status === 'done').length} / {items.length}
                  </strong>{' '}
                  topics complete
                </span>
              </div>
            </div>
          )}
          <div className="routine-targets">
            {targets.map((target) => (
              <TargetCard
                key={`${routine.id}-${target.id}`}
                data={data}
                routine={routine}
                target={target}
                focusedMinutes={focused.get(target.id) || 0}
                onEdit={() => setTargetDialog(target)}
                onOpen={onOpen}
              />
            ))}
          </div>
          {targets.length === 0 && (
            <Empty
              icon={<Target size={27} />}
              title="Start with one learning area."
              description="For example: Frontend — 4 hours. Then add React state, CSS layouts, or whatever you want to study."
              action={
                <Button onClick={() => setTargetDialog('new')}>
                  <Plus size={15} />
                  Add your first target
                </Button>
              }
            />
          )}
          {targets.length > 0 && (
            <button className="routine-add-area" onClick={() => setTargetDialog('new')}>
              <Plus size={18} />
              <span>Add another learning area</span>
            </button>
          )}
        </>
      )}
      {routineDialog && (
        <RoutineDialog
          routine={routineDialog === 'edit' ? routine : undefined}
          onClose={() => setRoutineDialog(null)}
          onSaved={setSelected}
        />
      )}
      {targetDialog && routine && (
        <TargetDialog
          data={data}
          routine={routine}
          target={targetDialog === 'new' ? undefined : targetDialog}
          onClose={() => setTargetDialog(null)}
        />
      )}
      {deleting && routine && (
        <Confirm
          title="Delete this routine?"
          description="The routine and its learning targets will be removed. Your library, notes, resources, and saved focus sessions stay saved."
          onClose={() => setDeleting(false)}
          onConfirm={() => repository.removeRoutine(routine.id)}
        />
      )}
    </div>
  );
}
