'use client';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ArrowUpRight, Play, Link2, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button, Field, Modal, IconButton, Confirm } from '@/components/ui';
import { db, uid } from '@/lib/db';
import { readableTime, resumeUrl, safeUrl, type Resource, type ResourceType } from '@/lib/models';
import { report } from '@/lib/store';
const types: ResourceType[] = ['YouTube', 'Course', 'Article', 'Documentation', 'GitHub', 'Other'];
const schema = z.object({
  title: z.string().trim().min(1).max(300),
  url: z.string().refine((v) => {
    try {
      safeUrl(v);
      return true;
    } catch {
      return false;
    }
  }, 'Enter a valid http or https URL.'),
  type: z.enum(types),
  note: z.string(),
  position: z.number().min(0),
  duration: z.number().min(0),
  resumeNote: z.string(),
  status: z.enum(['todo', 'learning', 'done']),
});
export function ResourceDialog({
  topicId,
  resource,
  onClose,
}: {
  topicId: string;
  resource?: Resource;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: resource?.title || '',
      url: resource?.url || '',
      type: resource?.type || 'YouTube',
      note: resource?.note || '',
      position: resource?.position || 0,
      duration: resource?.duration || 0,
      resumeNote: resource?.resumeNote || '',
      status: resource?.status || 'todo',
    },
  });
  const type = useWatch({ control, name: 'type' }),
    position = useWatch({ control, name: 'position' });
  return (
    <Modal
      title={resource ? 'Edit learning resource' : 'Save a learning resource'}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit(async (values) => {
          try {
            await db.resources.put({
              ...values,
              id: resource?.id || uid(),
              topicId,
              url: safeUrl(values.url),
              lastVisited: resource?.lastVisited || 0,
            });
            onClose();
          } catch (error) {
            report(error);
          }
        })}
      >
        <Field label="Title">
          <input
            autoFocus
            placeholder="e.g. Understanding React rendering"
            {...register('title')}
          />
          {errors.title && <small className="form-error">A title is required.</small>}
        </Field>
        <Field label="URL">
          <input type="url" placeholder="https://…" {...register('url')} />
          {errors.url && <small className="form-error">{errors.url.message}</small>}
        </Field>
        <div className="form-grid">
          <Field label="Resource type">
            <select {...register('type')}>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Progress">
            <select {...register('status')}>
              <option value="todo">Not started</option>
              <option value="learning">In progress</option>
              <option value="done">Completed</option>
            </select>
          </Field>
        </div>
        {type === 'YouTube' ? (
          <div className="form-grid">
            <Field
              label="Resume position (seconds)"
              hint={`Resume at ${readableTime(position || 0)}`}
            >
              <input type="number" min="0" {...register('position', { valueAsNumber: true })} />
            </Field>
            <Field label="Duration (seconds, optional)">
              <input type="number" min="0" {...register('duration', { valueAsNumber: true })} />
            </Field>
          </div>
        ) : (
          <Field label="Where did you stop?" hint="Manually save a lesson, chapter, or position.">
            <input placeholder="e.g. Module 3, lesson 4" {...register('resumeNote')} />
          </Field>
        )}
        <Field label="Personal note">
          <textarea
            rows={3}
            placeholder="Why this is worth coming back to…"
            {...register('note')}
          />
        </Field>
        <div className="form-actions">
          <Button secondary type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Save resource
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ResourceList({ topicId, resources }: { topicId: string; resources: Resource[] }) {
  const [editing, setEditing] = useState<Resource | 'new' | null>(null),
    [deleting, setDeleting] = useState<Resource | null>(null);
  return (
    <section className="resource-section">
      <div className="section-title">
        <h2>
          Learning resources <span className="count-badge">{resources.length}</span>
        </h2>
        <button className="subtle-button" onClick={() => setEditing('new')}>
          <Plus size={14} />
          Add resource
        </button>
      </div>
      {resources.length === 0 ? (
        <button className="resource-empty" onClick={() => setEditing('new')}>
          <Link2 size={20} />
          <span>
            Keep the good stuff close.
            <small>Save a tutorial, an article, or a place to pick up later.</small>
          </span>
          <Plus size={17} />
        </button>
      ) : (
        <div className="resource-list">
          {resources.map((r) => (
            <article className="resource-row" key={r.id}>
              <span className={`resource-icon ${r.type === 'YouTube' ? 'youtube' : ''}`}>
                {r.type === 'YouTube' ? <Play size={17} /> : <Link2 size={17} />}
              </span>
              <div className="resource-info">
                <strong>{r.title}</strong>
                <span>
                  {r.type}
                  <span className="dot-separator">·</span>
                  {r.status === 'done'
                    ? 'Completed'
                    : r.status === 'learning'
                      ? 'In progress'
                      : 'Not started'}
                  {r.type === 'YouTube' && r.position > 0
                    ? ` · Saved at ${readableTime(r.position)}`
                    : r.resumeNote
                      ? ` · ${r.resumeNote}`
                      : ''}
                </span>
                {r.note && <p>{r.note}</p>}
                {r.lastVisited > 0 && (
                  <small>Last opened {new Date(r.lastVisited).toLocaleDateString()}</small>
                )}
              </div>
              <a
                className="resource-resume"
                href={resumeUrl(r)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  void db.resources
                    .update(r.id, {
                      lastVisited: Date.now(),
                      status: r.status === 'todo' ? 'learning' : r.status,
                    })
                    .catch(report)
                }
              >
                {r.position > 0 || r.resumeNote ? 'Resume' : 'Open'}
                <ArrowUpRight size={14} />
              </a>
              <IconButton label={`Edit ${r.title}`} onClick={() => setEditing(r)}>
                <MoreHorizontal size={17} />
              </IconButton>
              <IconButton label={`Delete resource ${r.title}`} onClick={() => setDeleting(r)}>
                <Trash2 size={14} />
              </IconButton>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <ResourceDialog
          topicId={topicId}
          resource={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete resource?"
          description={`Remove “${deleting.title}” and its saved resume position? Your topic notes are kept.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await db.resources.delete(deleting.id);
          }}
        />
      )}
    </section>
  );
}
