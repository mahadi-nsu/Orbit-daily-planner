'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  AlignLeft,
  Check,
  ListTodo,
  MoreHorizontal,
  Trash2,
  ArrowRight,
  CircleDashed,
  Play,
} from 'lucide-react';
import { Button, Modal, Field, IconButton, Confirm } from '@/components/ui';
import { repository } from '@/lib/db';
import { taskInputSchema, type TaskInput } from '@/lib/task-schema';
import { addDays, localDate, type Task, type TaskStatus, type Workspace } from '@/lib/models';
import { report } from '@/lib/store';
import type { z } from 'zod';

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
};
function prettyDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
}
function weekFor(date: string): string[] {
  const day = new Date(`${date}T12:00:00`).getDay();
  const monday = addDays(date, -(day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function TaskDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput, unknown, z.output<typeof taskInputSchema>>({
    resolver: zodResolver(taskInputSchema),
    defaultValues: {
      title: task.title,
      details: task.details,
      date: task.date,
      status: task.status,
    },
  });
  return (
    <>
      <Modal title="A little more detail" onClose={onClose}>
        <form
          onSubmit={handleSubmit(async (values) => {
            try {
              await repository.updateTask(task.id, values);
              onClose();
            } catch (error) {
              report(error);
            }
          })}
        >
          <Field label="Task">
            <input autoFocus maxLength={300} {...register('title')} />
            {errors.title && <small className="form-error">{errors.title.message}</small>}
          </Field>
          <div className="form-grid">
            <Field label="Task date">
              <input type="date" required {...register('date')} />
            </Field>
            <Field label="Task status">
              <select {...register('status')}>
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </Field>
          </div>
          <Field label="Details (optional)">
            <textarea
              rows={5}
              maxLength={20000}
              placeholder="A note, a few steps, or anything worth remembering…"
              {...register('details')}
            />
          </Field>
          <div className="task-dialog-meta">
            Created{' '}
            {prettyDate(localDate(new Date(task.createdAt)), {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div className="form-actions">
            <button type="button" className="task-delete-button" onClick={() => setDeleting(true)}>
              <Trash2 size={15} />
              Delete task
            </button>
            <Button secondary type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save task
            </Button>
          </div>
        </form>
      </Modal>
      {deleting && (
        <Confirm
          title="Delete this task?"
          description={`“${task.title}” and its details will be permanently removed.`}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await repository.deleteTask(task.id);
            onClose();
          }}
        />
      )}
    </>
  );
}

function TaskRow({
  task,
  onEdit,
  showDate = false,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  showDate?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const status = pendingStatus ?? task.status;
  const completed = status === 'done';
  useEffect(() => {
    if (task.status === pendingStatus) setPendingStatus(null);
  }, [task.status, pendingStatus]);
  return (
    <li className={`task-row status-${status} ${completed ? 'is-done' : ''}`}>
      <label className="task-checkbox">
        <input
          type="checkbox"
          checked={completed}
          disabled={busy}
          aria-label={`${completed ? 'Reopen' : 'Complete'} task: ${task.title}`}
          onChange={async (e) => {
            const checked = e.target.checked;
            setPendingStatus(checked ? 'done' : 'todo');
            setBusy(true);
            try {
              await repository.completeTask(task.id, checked);
            } catch (error) {
              setPendingStatus(null);
              report(error);
            } finally {
              setBusy(false);
            }
          }}
        />
        <span aria-hidden="true">{completed && <Check size={14} strokeWidth={2.5} />}</span>
      </label>
      <button
        className="task-row-content"
        onClick={() => onEdit(task)}
        aria-label={`Edit task: ${task.title}`}
      >
        <strong>{task.title}</strong>
        {task.details && (
          <span className="task-details-preview">
            <AlignLeft size={12} />
            <span>{task.details}</span>
          </span>
        )}
        {showDate && (
          <small>
            <CalendarDays size={11} />
            {prettyDate(task.date, { month: 'short', day: 'numeric' })}
          </small>
        )}
      </button>
      <select
        className={`task-status ${status}`}
        aria-label={`Status for ${task.title}`}
        value={status}
        disabled={busy}
        onChange={async (e) => {
          const status = e.target.value as TaskStatus;
          setPendingStatus(status);
          setBusy(true);
          try {
            await repository.updateTask(task.id, {
              title: task.title,
              details: task.details,
              date: task.date,
              status,
            });
          } catch (error) {
            setPendingStatus(null);
            report(error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <option value="todo">To do</option>
        <option value="in-progress">In progress</option>
        <option value="done">Done</option>
      </select>
      <IconButton label={`Task options: ${task.title}`} onClick={() => onEdit(task)}>
        <MoreHorizontal size={18} />
      </IconButton>
    </li>
  );
}

export function TaskHome({ data }: { data: Workspace }) {
  const today = localDate();
  const [date, setDate] = useState(today),
    [filter, setFilter] = useState<'all' | TaskStatus>('all'),
    [title, setTitle] = useState(''),
    [details, setDetails] = useState(''),
    [detailsOpen, setDetailsOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Task | null>(null),
    [showCompleted, setShowCompleted] = useState(true),
    [showEarlier, setShowEarlier] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dayTasks = data.tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const visible = dayTasks.filter((t) => filter === 'all' || t.status === filter),
    active = visible.filter((t) => t.status !== 'done'),
    completed = visible.filter((t) => t.status === 'done');
  const earlier = data.tasks
    .filter((t) => t.date < today && t.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const changeDate = (value: string) => {
    if (!value) return;
    setDate(value);
    setFilter('all');
  };
  const counts = {
    all: dayTasks.length,
    todo: dayTasks.filter((t) => t.status === 'todo').length,
    'in-progress': dayTasks.filter((t) => t.status === 'in-progress').length,
    done: dayTasks.filter((t) => t.status === 'done').length,
  };
  const dayLabel =
    date === today
      ? 'Today'
      : date === addDays(today, 1)
        ? 'Tomorrow'
        : date === addDays(today, -1)
          ? 'Yesterday'
          : prettyDate(date, { month: 'long', day: 'numeric' });
  return (
    <div className="task-home">
      <header className="task-page-heading">
        <div>
          <h1>{date === today ? 'My day.' : 'Your day.'}</h1>
          <p>
            {prettyDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="task-date-controls">
          <IconButton label="Previous day" onClick={() => changeDate(addDays(date, -1))}>
            <ChevronLeft size={18} />
          </IconButton>
          <button
            type="button"
            className={`task-today-button ${date === today ? 'selected' : ''}`}
            onClick={() => changeDate(today)}
          >
            Today
          </button>
          <IconButton label="Next day" onClick={() => changeDate(addDays(date, 1))}>
            <ChevronRight size={18} />
          </IconButton>
          <span className="task-date-separator" />
          <label className="task-date-picker">
            <CalendarDays size={16} />
            <input
              type="date"
              aria-label="Choose task date"
              required
              value={date}
              onChange={(e) => changeDate(e.target.value)}
            />
          </label>
        </div>
      </header>
      <nav className="task-week" aria-label="Task dates">
        {weekFor(date).map((day) => {
          const count = data.tasks.filter((t) => t.date === day).length;
          return (
            <button
              type="button"
              key={day}
              aria-label={`View tasks for ${day}`}
              aria-pressed={date === day}
              aria-current={day === today ? 'date' : undefined}
              title={`${prettyDate(day, { weekday: 'long', month: 'long', day: 'numeric' })}${count ? ` · ${count} ${count === 1 ? 'task' : 'tasks'}` : ''}`}
              className={`${date === day ? 'selected' : ''} ${day === today ? 'is-today' : ''}`}
              onClick={() => changeDate(day)}
            >
              <span>{prettyDate(day, { weekday: 'short' })}</span>
              <strong>{new Date(`${day}T12:00:00`).getDate()}</strong>
              {count > 0 && (
                <small>
                  {count}
                  <span className="sr-only"> {count === 1 ? 'task' : 'tasks'}</span>
                </small>
              )}
            </button>
          );
        })}
      </nav>
      <form
        className={`task-composer ${detailsOpen ? 'expanded' : ''}`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || !title.trim()) return;
          setBusy(true);
          try {
            await repository.createTask({ title, details, date });
            setTitle('');
            setDetails('');
            setDetailsOpen(false);
            input.current?.focus();
          } catch (error) {
            report(error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="task-composer-row">
          <Plus size={21} />
          <input
            ref={input}
            aria-label="New task"
            maxLength={300}
            placeholder={`Add a task for ${dayLabel.toLowerCase()}…`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <IconButton
            label={detailsOpen ? 'Hide task details' : 'Add task details'}
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen(!detailsOpen)}
          >
            <AlignLeft size={18} />
          </IconButton>
          <Button type="submit" disabled={busy || !title.trim()}>
            {busy ? 'Adding…' : 'Add task'}
            <Plus size={15} />
          </Button>
        </div>
        {detailsOpen && (
          <div className="task-composer-details">
            <textarea
              aria-label="New task details"
              maxLength={20000}
              rows={3}
              placeholder="Details, if you need them. Otherwise, just the task is enough."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            <small>Optional · saved with this task</small>
          </div>
        )}
      </form>
      <section className="task-list-section" aria-label={`${dayLabel} tasks`}>
        <div className="task-list-toolbar">
          <div className="task-filters" role="group" aria-label="Filter tasks">
            {(['all', 'todo', 'in-progress', 'done'] as const).map((status) => (
              <button
                type="button"
                key={status}
                data-status={status}
                aria-pressed={filter === status}
                onClick={() => {
                  setFilter(status);
                  if (status === 'done') setShowCompleted(true);
                }}
              >
                {status === 'all' ? 'All' : statusLabels[status]}
                <span>{counts[status]}</span>
              </button>
            ))}
          </div>
          <span className="task-day-progress">
            {dayTasks.length
              ? `${counts.done} of ${counts.all} completed`
              : 'A fresh page for your day.'}
          </span>
        </div>
        {visible.length === 0 ? (
          <div className="task-empty">
            <span>
              <ListTodo size={28} strokeWidth={1.3} />
            </span>
            <h2>
              {dayTasks.length === 0
                ? 'Nothing planned for this day yet.'
                : 'A little breathing room.'}
            </h2>
            <p>
              {dayTasks.length === 0
                ? 'Add one task. Give it a date. Take it from there.'
                : `No ${statusLabels[filter as TaskStatus]?.toLowerCase() || ''} tasks for this date.`}
            </p>
            {dayTasks.length === 0 && (
              <button type="button" className="text-link" onClick={() => input.current?.focus()}>
                Start with one small thing
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <>
            {(['in-progress', 'todo'] as const).map((status) => {
              const tasks = active.filter((task) => task.status === status);
              if (!tasks.length) return null;
              return (
                <section
                  key={status}
                  className={`task-status-group ${status}`}
                  aria-labelledby={`task-heading-${status}`}
                >
                  <header>
                    <span className="task-section-icon" aria-hidden="true">
                      {status === 'in-progress' ? <Play size={14} /> : <CircleDashed size={16} />}
                    </span>
                    <h2 id={`task-heading-${status}`}>{statusLabels[status]}</h2>
                    <span className="task-section-count">{tasks.length}</span>
                    <span className="task-section-hint">
                      {status === 'in-progress' ? 'In focus' : 'Up next'}
                    </span>
                  </header>
                  <ul className="task-list" aria-label={`${statusLabels[status]} tasks`}>
                    {tasks.map((task) => (
                      <TaskRow key={task.id} task={task} onEdit={setEditing} />
                    ))}
                  </ul>
                </section>
              );
            })}
            {completed.length > 0 && (
              <div className="task-completed">
                <button
                  type="button"
                  className="task-group-toggle"
                  aria-expanded={showCompleted}
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  <ChevronDown size={15} className={showCompleted ? '' : 'collapsed'} />
                  <span>Completed</span>
                  <span className="count-badge">{completed.length}</span>
                </button>
                {showCompleted && (
                  <ul className="task-list" aria-label="Completed tasks">
                    {completed.map((task) => (
                      <TaskRow key={task.id} task={task} onEdit={setEditing} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </section>
      {date === today && earlier.length > 0 && (
        <section className="task-earlier">
          <button
            type="button"
            className="task-group-toggle"
            aria-expanded={showEarlier}
            onClick={() => setShowEarlier(!showEarlier)}
          >
            <ChevronDown size={15} className={showEarlier ? '' : 'collapsed'} />
            <span>Unfinished from earlier days</span>
            <span className="count-badge">{earlier.length}</span>
          </button>
          {showEarlier && (
            <ul className="task-list" aria-label="Earlier unfinished tasks">
              {earlier.map((task) => (
                <TaskRow key={task.id} task={task} showDate onEdit={setEditing} />
              ))}
            </ul>
          )}
        </section>
      )}
      {editing && <TaskDialog task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
