import Dexie, { type Table } from 'dexie';
import type {
  Category,
  Topic,
  TopicDocument,
  ImageAsset,
  Resource,
  Routine,
  ScheduledSession,
  StudySession,
  Preference,
  TimerState,
  Task,
  RoutineTarget,
  RoutineItem,
} from './models';
import {
  routineSchema,
  routineTargetSchema,
  routineItemSchema,
  targetsFromSessions,
} from './routine-plan';
import { taskInputSchema, type TaskInput } from './task-schema';
import { descendants, elapsedSeconds, localDate, addDays, imageReferences } from './models';
export class OrbitDB extends Dexie {
  tasks!: Table<Task>;
  categories!: Table<Category>;
  topics!: Table<Topic>;
  documents!: Table<TopicDocument>;
  images!: Table<ImageAsset>;
  resources!: Table<Resource>;
  routines!: Table<Routine>;
  scheduled!: Table<ScheduledSession>;
  studies!: Table<StudySession>;
  preferences!: Table<Preference>;
  constructor(name = 'orbit-workspace') {
    super(name);
    this.version(1).stores({
      categories: 'id, order, archived',
      topics: 'id, categoryId, parentTopicId, status, updatedAt, openedAt',
      documents: 'id, updatedAt',
      images: 'id, topicId',
      resources: 'id, topicId, status',
      routines: 'id, startDate',
      scheduled: 'id, routineId, topicId, date',
      studies: 'id, topicId, startedAt',
      preferences: 'id',
    });
    this.version(2).stores({
      topics:
        'id, categoryId, parentTopicId, status, updatedAt, openedAt, [categoryId+parentTopicId]',
    });
    this.version(3).stores({
      topics:
        'id, categoryId, parentTopicId, status, updatedAt, openedAt, order, [categoryId+parentTopicId]',
    });
    this.version(4).stores({ tasks: 'id, date, status, createdAt, [date+status]' });
    this.version(5)
      .stores({})
      .upgrade(async (tx) => {
        const topics = await tx.table('topics').toArray();
        const categories = await tx.table('categories').toArray();
        const scheduled = await tx.table('scheduled').toArray();
        for (const routine of await tx.table('routines').toArray()) {
          if (!routine.targets)
            await tx.table('routines').update(routine.id, {
              targets: targetsFromSessions(routine.id, scheduled, topics, categories),
            });
        }
      });
  }
}
export const db = new OrbitDB();
export const uid = () => crypto.randomUUID();
export const repository = {
  async saveRoutine(input: { title: string; startDate: string; days: number }, id?: string) {
    const values = routineSchema.parse(input);
    const routineId = id || uid();
    await db.transaction('rw', db.routines, async () => {
      if (id) {
        if (!(await db.routines.get(id))) throw new Error('This routine no longer exists.');
        await db.routines.update(id, values);
      } else
        await db.routines.add({ ...values, id: routineId, createdAt: Date.now(), targets: [] });
    });
    return routineId;
  },
  async saveRoutineTarget(routineId: string, input: RoutineTarget) {
    const target = routineTargetSchema.parse(input);
    await db.transaction('rw', [db.routines, db.categories, db.topics], async () => {
      const routine = await db.routines.get(routineId);
      if (!routine) throw new Error('This routine no longer exists.');
      if (target.categoryId && !(await db.categories.get(target.categoryId)))
        throw new Error('Choose an existing learning area.');
      for (const item of target.items)
        if (item.topicId && !(await db.topics.get(item.topicId)))
          throw new Error('This linked topic no longer exists.');
      const targets = [...(routine.targets || [])];
      const index = targets.findIndex((t) => t.id === target.id);
      if (index < 0) targets.push(target);
      else targets[index] = { ...target, items: targets[index].items };
      await db.routines.update(routineId, { targets });
    });
  },
  async removeRoutineTarget(routineId: string, targetId: string) {
    await db.transaction('rw', db.routines, async () => {
      const routine = await db.routines.get(routineId);
      if (!routine) throw new Error('This routine no longer exists.');
      await db.routines.update(routineId, {
        targets: (routine.targets || []).filter((t) => t.id !== targetId),
      });
    });
  },
  async saveRoutineItem(routineId: string, targetId: string, input: RoutineItem) {
    const item = routineItemSchema.parse(input);
    await db.transaction('rw', [db.routines, db.topics], async () => {
      const routine = await db.routines.get(routineId);
      const target = routine?.targets?.find((t) => t.id === targetId);
      if (!routine || !target) throw new Error('This learning target no longer exists.');
      if (item.topicId && !(await db.topics.get(item.topicId)))
        throw new Error('This linked topic no longer exists.');
      const items = [...target.items];
      const index = items.findIndex((i) => i.id === item.id);
      if (index < 0) items.push(item);
      else items[index] = item;
      await db.routines.update(routineId, {
        targets: routine.targets!.map((t) => (t.id === targetId ? { ...t, items } : t)),
      });
    });
  },
  async removeRoutineItem(routineId: string, targetId: string, itemId: string) {
    await db.transaction('rw', db.routines, async () => {
      const routine = await db.routines.get(routineId);
      if (!routine) throw new Error('This routine no longer exists.');
      await db.routines.update(routineId, {
        targets: routine.targets?.map((t) =>
          t.id === targetId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t,
        ),
      });
    });
  },
  async createTask(input: TaskInput) {
    const values = taskInputSchema.parse(input),
      id = uid(),
      now = Date.now();
    await db.tasks.add({
      ...values,
      id,
      createdAt: now,
      updatedAt: now,
      completedAt: values.status === 'done' ? now : null,
    });
    return id;
  },
  async updateTask(id: string, input: TaskInput) {
    const values = taskInputSchema.parse(input);
    await db.transaction('rw', db.tasks, async () => {
      const task = await db.tasks.get(id);
      if (!task) throw new Error('This task no longer exists.');
      await db.tasks.update(id, {
        ...values,
        updatedAt: Date.now(),
        completedAt: values.status === 'done' ? (task.completedAt ?? Date.now()) : null,
      });
    });
  },
  async completeTask(id: string, completed: boolean) {
    await db.transaction('rw', db.tasks, async () => {
      const task = await db.tasks.get(id);
      if (!task) throw new Error('This task no longer exists.');
      await db.tasks.update(id, {
        status: completed ? 'done' : 'todo',
        completedAt: completed ? (task.completedAt ?? Date.now()) : null,
        updatedAt: Date.now(),
      });
    });
  },
  async deleteTask(id: string) {
    await db.tasks.delete(id);
  },
  async initialize() {
    await db.transaction('rw', [db.preferences, db.categories], async () => {
      if (await db.preferences.get('initialized')) return;
      const names = ['Frontend', 'Backend', 'Artificial intelligence', 'Interview prep'];
      await db.categories.bulkAdd(
        names.map((title, order) => ({
          id: uid(),
          title,
          color: ['#a897f9', '#74c7cb', '#d7b57a', '#e197b3'][order],
          order,
          archived: false,
        })),
      );
      await db.preferences.put({ id: 'initialized', value: true });
    });
  },
  async createCategory(title: string, color: string) {
    const id = uid();
    await db.categories.add({
      id,
      title: title.trim(),
      color,
      order: await db.categories.count(),
      archived: false,
    });
    return id;
  },
  async createTopic(title: string, categoryId: string, parentTopicId: string | null = null) {
    const id = uid(),
      now = Date.now();
    if (!(await db.categories.get(categoryId))) throw new Error('Category no longer exists.');
    if (parentTopicId) {
      const p = await db.topics.get(parentTopicId);
      if (!p || p.categoryId !== categoryId) throw new Error('Invalid parent topic.');
    }
    await db.transaction('rw', [db.topics, db.documents], async () => {
      await db.topics.add({
        id,
        title: title.trim(),
        categoryId,
        parentTopicId,
        status: 'todo',
        order: await db.topics.count(),
        archived: false,
        createdAt: now,
        updatedAt: now,
        openedAt: now,
      });
      await db.documents.add({
        id,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        text: '',
        updatedAt: now,
      });
    });
    return id;
  },
  async saveDocument(id: string, content: TopicDocument['content'], text: string) {
    await db.transaction('rw', [db.documents, db.topics], async () => {
      if (!(await db.topics.get(id))) return;
      const now = Date.now();
      await db.documents.put({ id, content, text, updatedAt: now });
      await db.topics.update(id, { updatedAt: now });
    });
  },
  async moveTopic(id: string, categoryId: string, parentTopicId: string | null) {
    const all = await db.topics.toArray(),
      ids = descendants(all, id);
    if (ids.includes(parentTopicId || ''))
      throw new Error('A topic cannot be moved inside itself or its descendants.');
    if (!(await db.categories.get(categoryId))) throw new Error('Choose an existing category.');
    if (parentTopicId) {
      const parent = all.find((t) => t.id === parentTopicId);
      if (!parent || parent.categoryId !== categoryId)
        throw new Error('Choose a parent in the destination category.');
    }
    await db.transaction('rw', db.topics, async () => {
      await db.topics.where('id').anyOf(ids).modify({ categoryId });
      await db.topics.update(id, { parentTopicId });
    });
  },
  async archiveTopic(id: string, archived: boolean) {
    const ids = descendants(await db.topics.toArray(), id);
    await db.topics.where('id').anyOf(ids).modify({ archived });
  },
  async deleteTopic(id: string) {
    const ids = descendants(await db.topics.toArray(), id);
    await db.transaction(
      'rw',
      [
        db.topics,
        db.documents,
        db.images,
        db.resources,
        db.scheduled,
        db.studies,
        db.preferences,
        db.routines,
      ],
      async () => {
        await db.topics.bulkDelete(ids);
        await db.documents.bulkDelete(ids);
        // An image copied into another document must survive its original topic.
        const candidates = await db.images.where('topicId').anyOf(ids).toArray();
        const retained = new Map<string, string>();
        for (const document of await db.documents.toArray()) {
          for (const assetId of imageReferences(document.content))
            retained.set(assetId, document.id);
        }
        for (const asset of candidates) {
          const owner = retained.get(asset.id);
          if (owner) await db.images.update(asset.id, { topicId: owner });
          else await db.images.delete(asset.id);
        }
        await db.resources.where('topicId').anyOf(ids).delete();
        await db.scheduled.where('topicId').anyOf(ids).delete();
        await db.studies.where('topicId').anyOf(ids).delete();
        for (const routine of await db.routines.toArray()) {
          if (
            routine.targets?.some((t) => t.items.some((i) => i.topicId && ids.includes(i.topicId)))
          )
            await db.routines.update(routine.id, {
              targets: routine.targets.map((t) => ({
                ...t,
                items: t.items.map((i) =>
                  i.topicId && ids.includes(i.topicId) ? { ...i, topicId: null } : i,
                ),
              })),
            });
        }
        const t = (await db.preferences.get('timer'))?.value as TimerState | null;
        if (t && ids.includes(t.topicId)) await db.preferences.delete('timer');
      },
    );
  },
  async deleteCategory(id: string) {
    await db.transaction('rw', db.tables, async () => {
      for (const t of await db.topics.where('categoryId').equals(id).toArray())
        await this.deleteTopic(t.id);
      await db.categories.delete(id);
      for (const routine of await db.routines.toArray())
        if (routine.targets?.some((t) => t.categoryId === id))
          await db.routines.update(routine.id, {
            targets: routine.targets.map((t) =>
              t.categoryId === id ? { ...t, categoryId: null } : t,
            ),
          });
    });
  },
  async reorder(kind: 'topics' | 'categories', id: string, direction: number) {
    const table = kind === 'topics' ? db.topics : db.categories;
    const all = await table.toArray();
    const item = all.find((t) => t.id === id);
    if (!item) return;
    const siblings = all
      .filter(
        (t) =>
          kind === 'categories' ||
          ((t as Topic).categoryId === (item as Topic).categoryId &&
            (t as Topic).parentTopicId === (item as Topic).parentTopicId),
      )
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((t) => t.id === id),
      other = index + direction;
    if (other < 0 || other >= siblings.length) return;
    [siblings[index], siblings[other]] = [siblings[other], siblings[index]];
    await db.transaction('rw', table, async () => {
      for (let i = 0; i < siblings.length; i++) await table.update(siblings[i].id, { order: i });
    });
  },
  async duplicateRoutine(id: string) {
    const routine = await db.routines.get(id);
    if (!routine) return;
    const copy = {
      ...routine,
      id: uid(),
      title: `${routine.title} (copy)`,
      createdAt: Date.now(),
      targets: routine.targets?.map((target) => ({
        ...target,
        id: uid(),
        items: target.items.map((item) => ({ ...item, id: uid(), status: 'todo' as const })),
      })),
    };
    await db.transaction('rw', [db.routines, db.scheduled], async () => {
      await db.routines.add(copy);
      await db.scheduled.bulkAdd(
        (await db.scheduled.where('routineId').equals(id).toArray()).map((s) => ({
          ...s,
          id: uid(),
          routineId: copy.id,
          completed: false,
        })),
      );
    });
    return copy.id;
  },
  async resizeRoutine(id: string, days: number) {
    const r = await db.routines.get(id);
    if (!r || days < r.days) throw new Error('Extend the routine to preserve your schedule.');
    if (days > 3650) throw new Error('Choose at most 3650 days.');
    await db.routines.update(id, { days });
  },
  async schedule(session: ScheduledSession) {
    const r = await db.routines.get(session.routineId);
    if (!r || !(await db.topics.get(session.topicId)))
      throw new Error('Choose a valid routine and topic.');
    if (session.date < r.startDate || session.date > addDays(r.startDate, r.days - 1))
      throw new Error('This date is outside your routine. Extend it first.');
    await db.scheduled.put(session);
  },
  async startTimer(topicId: string, target = 25 * 60) {
    await db.transaction('rw', [db.preferences, db.topics], async () => {
      if ((await db.preferences.get('timer'))?.value)
        throw new Error('Finish the current focus session first.');
      if (!(await db.topics.get(topicId))) throw new Error('Choose an existing topic.');
      await db.preferences.put({
        id: 'timer',
        value: {
          topicId,
          startedAt: Date.now(),
          runningSince: Date.now(),
          elapsed: 0,
          target,
        } satisfies TimerState,
      });
    });
  },
  async toggleTimer() {
    await db.transaction('rw', db.preferences, async () => {
      const t = (await db.preferences.get('timer'))?.value as TimerState | null;
      if (!t) return;
      await db.preferences.put({
        id: 'timer',
        value: {
          ...t,
          elapsed: elapsedSeconds(t),
          runningSince: t.runningSince ? null : Date.now(),
        },
      });
    });
  },
  async finishTimer(note: string) {
    await db.transaction('rw', [db.preferences, db.studies], async () => {
      const t = (await db.preferences.get('timer'))?.value as TimerState | null;
      if (!t) return;
      await db.studies.add({
        id: uid(),
        topicId: t.topicId,
        startedAt: t.startedAt,
        duration: Math.round(elapsedSeconds(t)),
        note,
      });
      await db.preferences.delete('timer');
    });
  },
  async removeRoutine(id: string) {
    await db.transaction('rw', [db.routines, db.scheduled], async () => {
      await db.scheduled.where('routineId').equals(id).delete();
      await db.routines.delete(id);
    });
  },
  today: localDate,
};
