'use client';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Modal, Confirm, IconButton } from '@/components/ui';
import {
  COLORS,
  descendants,
  localDate,
  type Category,
  type Topic,
  type Workspace,
} from '@/lib/models';
import { db, repository } from '@/lib/db';
import { report, useUI } from '@/lib/store';
import { ArrowUp, ArrowDown, Archive, Trash2, Plus } from 'lucide-react';
const topicSchema = z.object({
  title: z.string().trim().min(1, 'Give your topic a name.').max(200),
  categoryId: z.string().min(1, 'Choose a category.'),
  parentTopicId: z.string(),
});
type TopicFields = z.infer<typeof topicSchema>;
export function TopicDialog({
  data,
  topic,
  parent,
  categoryId,
  onClose,
  onCreated,
}: {
  data: Workspace;
  topic?: Topic;
  parent?: Topic;
  categoryId?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingParent, setAddingParent] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(COLORS[0]);
  const [parentName, setParentName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdCategories, setCreatedCategories] = useState<Category[]>([]);
  const [createdParents, setCreatedParents] = useState<Topic[]>([]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<TopicFields>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      title: topic?.title || '',
      categoryId:
        topic?.categoryId ||
        parent?.categoryId ||
        categoryId ||
        data.categories.find((c) => !c.archived)?.id ||
        '',
      parentTopicId: topic?.parentTopicId || parent?.id || '',
    },
  });
  const selected = useWatch({ control, name: 'categoryId' });
  const selectedParent = useWatch({ control, name: 'parentTopicId' });
  const categories = [
    ...new Map([...createdCategories, ...data.categories].map((c) => [c.id, c])).values(),
  ];
  const topics = [...new Map([...createdParents, ...data.topics].map((t) => [t.id, t])).values()];
  const excluded = topic ? descendants(data.topics, topic.id) : [];
  const busy = creating || isSubmitting;
  const chooseCategory = (id: string) => {
    setValue('categoryId', id, { shouldValidate: true, shouldDirty: true });
    if (id !== selected) setValue('parentTopicId', '', { shouldDirty: true });
    setAddingParent(false);
    setParentName('');
  };
  const addCategory = async () => {
    if (busy || !categoryName.trim()) return;
    setCreating(true);
    try {
      const values = categorySchema.parse({ title: categoryName, color: categoryColor });
      let category = categories.find(
        (c) => !c.archived && c.title.toLowerCase() === values.title.toLowerCase(),
      );
      if (!category) {
        const id = await repository.createCategory(values.title, values.color);
        category = { id, ...values, order: categories.length, archived: false };
        setCreatedCategories((current) => [...current, category!]);
      }
      chooseCategory(category.id);
      setAddingCategory(false);
      setCategoryName('');
      requestAnimationFrame(() => setFocus('categoryId'));
    } catch (error) {
      report(error);
    } finally {
      setCreating(false);
    }
  };
  const addParent = async () => {
    if (busy || !selected || !parentName.trim()) return;
    setCreating(true);
    try {
      const title = topicSchema.shape.title.parse(parentName);
      let parent = topics.find(
        (t) =>
          t.categoryId === selected &&
          !t.archived &&
          !excluded.includes(t.id) &&
          t.title.toLowerCase() === title.toLowerCase(),
      );
      if (!parent) {
        const id = await repository.createTopic(title, selected);
        const now = Date.now();
        parent = {
          id,
          title,
          categoryId: selected,
          parentTopicId: null,
          status: 'todo',
          order: topics.length,
          archived: false,
          createdAt: now,
          updatedAt: now,
          openedAt: now,
        };
        setCreatedParents((current) => [...current, parent!]);
      }
      setValue('parentTopicId', parent.id, { shouldValidate: true, shouldDirty: true });
      setAddingParent(false);
      setParentName('');
      requestAnimationFrame(() => setFocus('parentTopicId'));
    } catch (error) {
      report(error);
    } finally {
      setCreating(false);
    }
  };
  return (
    <>
      <Modal
        title={topic ? 'Edit topic' : parent ? 'Add a subtopic' : 'Create a topic'}
        onClose={onClose}
      >
        <form
          onSubmit={handleSubmit(async (values) => {
            try {
              if (topic) {
                await repository.moveTopic(
                  topic.id,
                  values.categoryId,
                  values.parentTopicId || null,
                );
                await db.topics.update(topic.id, { title: values.title, updatedAt: Date.now() });
                onClose();
              } else {
                const id = await repository.createTopic(
                  values.title,
                  values.categoryId,
                  values.parentTopicId || null,
                );
                onCreated(id);
                onClose();
              }
            } catch (error) {
              report(error);
            }
          })}
        >
          <Field label="Topic name">
            <input
              autoFocus
              maxLength={200}
              placeholder="What would you like to learn?"
              {...register('title')}
            />
            {errors.title && <small className="form-error">{errors.title.message}</small>}
          </Field>
          <Field label="Category">
            <select
              {...register('categoryId', { onChange: (e) => chooseCategory(e.target.value) })}
              value={selected}
              disabled={busy || addingCategory}
            >
              <option value="">Choose a category</option>
              {categories
                .filter((c) => !c.archived || c.id === topic?.categoryId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
            {!addingCategory && (
              <button
                type="button"
                className="topic-create-option"
                disabled={busy}
                onClick={() => {
                  setAddingCategory(true);
                  setAddingParent(false);
                }}
              >
                <Plus size={13} />
                New category
              </button>
            )}
            {addingCategory && (
              <section className="topic-inline-create" aria-label="New category">
                <Field label="New category name">
                  <input
                    autoFocus
                    maxLength={200}
                    placeholder="e.g. System design"
                    value={categoryName}
                    disabled={creating}
                    onChange={(e) => setCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void addCategory();
                      }
                    }}
                  />
                </Field>
                <div className="color-options" role="group" aria-label="Category color">
                  {COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      aria-label={`Choose ${color}`}
                      aria-pressed={categoryColor === color}
                      disabled={creating}
                      style={{ background: color }}
                      onClick={() => setCategoryColor(color)}
                    >
                      {categoryColor === color ? '✓' : ''}
                    </button>
                  ))}
                </div>
                <div className="topic-inline-actions">
                  <Button
                    type="button"
                    secondary
                    disabled={creating}
                    onClick={() => {
                      setAddingCategory(false);
                      setCategoryName('');
                      requestAnimationFrame(() => setFocus('categoryId'));
                    }}
                  >
                    Cancel category
                  </Button>
                  <Button
                    type="button"
                    disabled={creating || !categoryName.trim()}
                    onClick={() => void addCategory()}
                  >
                    {creating ? 'Adding…' : 'Add category'}
                  </Button>
                </div>
              </section>
            )}
            {errors.categoryId && <small className="form-error">{errors.categoryId.message}</small>}
          </Field>
          <Field label="Parent topic">
            <select
              {...register('parentTopicId')}
              value={selectedParent}
              disabled={busy || addingParent || addingCategory}
            >
              <option value="">No parent · top-level topic</option>
              {topics
                .filter(
                  (t) =>
                    t.categoryId === selected &&
                    !excluded.includes(t.id) &&
                    (!t.archived || t.id === topic?.parentTopicId),
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
            {!addingParent && (
              <button
                type="button"
                className="topic-create-option"
                disabled={busy || !selected || addingCategory}
                onClick={() => setAddingParent(true)}
              >
                <Plus size={13} />
                New parent topic
              </button>
            )}
            {addingParent && (
              <section className="topic-inline-create" aria-label="New parent topic">
                <Field
                  label="New parent topic name"
                  hint={`Created in ${categories.find((c) => c.id === selected)?.title || 'the selected category'} and selected as this topic’s parent.`}
                >
                  <input
                    autoFocus
                    maxLength={200}
                    placeholder="e.g. JavaScript foundations"
                    disabled={creating}
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void addParent();
                      }
                    }}
                  />
                </Field>
                <div className="topic-inline-actions">
                  <Button
                    type="button"
                    secondary
                    disabled={creating}
                    onClick={() => {
                      setAddingParent(false);
                      setParentName('');
                      requestAnimationFrame(() => setFocus('parentTopicId'));
                    }}
                  >
                    Cancel parent
                  </Button>
                  <Button
                    type="button"
                    disabled={creating || !parentName.trim()}
                    onClick={() => void addParent()}
                  >
                    {creating ? 'Adding…' : 'Add parent topic'}
                  </Button>
                </div>
              </section>
            )}
          </Field>
          {topic && (
            <div className="manage-actions">
              <span>Topic actions</span>
              <div>
                <IconButton
                  label="Move topic up"
                  onClick={() => void repository.reorder('topics', topic.id, -1).catch(report)}
                >
                  <ArrowUp size={16} />
                </IconButton>
                <IconButton
                  label="Move topic down"
                  onClick={() => void repository.reorder('topics', topic.id, 1).catch(report)}
                >
                  <ArrowDown size={16} />
                </IconButton>
                <button
                  type="button"
                  onClick={() =>
                    void repository
                      .archiveTopic(topic.id, !topic.archived)
                      .then(onClose)
                      .catch(report)
                  }
                >
                  <Archive size={15} />
                  {topic.archived ? 'Restore' : 'Archive'}
                </button>
                <button type="button" className="text-danger" onClick={() => setConfirm(true)}>
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </div>
          )}
          <div className="form-actions">
            <Button secondary type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || addingCategory || addingParent}>
              {topic ? 'Save changes' : 'Create topic'}
            </Button>
          </div>
        </form>
      </Modal>
      {confirm && (
        <Confirm
          title="Delete this topic?"
          description={`“${topic?.title}” and ${excluded.length - 1} nested topic(s), including their notes, images, resources, schedule entries, and study history will be permanently deleted. Other topics are kept. Export a backup first if you need a copy.`}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await repository.deleteTopic(topic!.id);
              onClose();
            } catch (error) {
              report(error);
            }
          }}
        />
      )}
    </>
  );
}
const categorySchema = z.object({
  title: z.string().trim().min(1, 'Give your category a name.').max(200),
  color: z.string(),
});
export function CategoryDialog({
  category,
  onClose,
}: {
  category?: Category;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { title: category?.title || '', color: category?.color || COLORS[0] },
  });
  const color = useWatch({ control, name: 'color' });
  return (
    <>
      <Modal title={category ? 'Edit category' : 'A new area of curiosity'} onClose={onClose}>
        <form
          onSubmit={handleSubmit(async (values) => {
            try {
              if (category) await db.categories.update(category.id, values);
              else await repository.createCategory(values.title, values.color);
              onClose();
            } catch (error) {
              report(error);
            }
          })}
        >
          <Field label="Category name">
            <input autoFocus placeholder="e.g. Creative coding" {...register('title')} />
            {errors.title && <small className="form-error">{errors.title.message}</small>}
          </Field>
          <Field label="Orbit color">
            <div className="color-options">
              {COLORS.map((c) => (
                <button
                  aria-label={`Choose ${c}`}
                  aria-pressed={color === c}
                  key={c}
                  type="button"
                  style={{ background: c }}
                  onClick={() => setValue('color', c)}
                >
                  {color === c ? '✓' : ''}
                </button>
              ))}
            </div>
          </Field>
          {category && (
            <div className="manage-actions">
              <span>Category actions</span>
              <div>
                <IconButton
                  label="Move category up"
                  onClick={() =>
                    void repository.reorder('categories', category.id, -1).catch(report)
                  }
                >
                  <ArrowUp size={16} />
                </IconButton>
                <IconButton
                  label="Move category down"
                  onClick={() =>
                    void repository.reorder('categories', category.id, 1).catch(report)
                  }
                >
                  <ArrowDown size={16} />
                </IconButton>
                <button
                  type="button"
                  onClick={() =>
                    void db.categories
                      .update(category.id, { archived: !category.archived })
                      .then(onClose)
                      .catch(report)
                  }
                >
                  <Archive size={15} />
                  {category.archived ? 'Restore' : 'Archive'}
                </button>
                <button className="text-danger" type="button" onClick={() => setConfirm(true)}>
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </div>
          )}
          <div className="form-actions">
            <Button secondary type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{category ? 'Save changes' : 'Create category'}</Button>
          </div>
        </form>
      </Modal>
      {confirm && (
        <Confirm
          title="Delete category and its contents?"
          description={`All topics, nested notes, images, resources, scheduled sessions, and study history inside “${category?.title}” will be permanently deleted. Other categories are kept. Export a backup before continuing if needed.`}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await repository.deleteCategory(category!.id);
              onClose();
            } catch (error) {
              report(error);
            }
          }}
        />
      )}
    </>
  );
}
export function QuickStart({
  data,
  onClose,
  onOpen,
}: {
  data: Workspace;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  return <TopicDialog data={data} onClose={onClose} onCreated={onOpen} />;
}
export const today = localDate;
export function notify(text: string) {
  useUI.getState().notify(text);
}
