import { beforeEach, expect, it } from 'vitest';
import Dexie from 'dexie';
import { db, OrbitDB, repository, uid } from '@/lib/db';
import { exportBackup, restoreBackup, validateBackup } from '@/lib/backup';
import { routineFocusMinutes } from '@/lib/routine-plan';
import { addDays, localDate, type Routine } from '@/lib/models';

beforeEach(async () => {
  for (const table of db.tables) await table.clear();
});
async function makePlan() {
  const categoryId = await repository.createCategory('Frontend', '#a897f9');
  const topicId = await repository.createTopic('React state', categoryId);
  const routineId = await repository.saveRoutine({
    title: 'My learning week',
    startDate: localDate(),
    days: 7,
  });
  const targetId = uid();
  await repository.saveRoutineTarget(routineId, {
    id: targetId,
    categoryId,
    title: 'Frontend',
    targetMinutes: 240,
    items: [],
  });
  return { categoryId, topicId, routineId, targetId };
}

it('keeps concurrent checklist changes, copies independent todo items, and round-trips the complete plan', async () => {
  const { categoryId, topicId, routineId, targetId } = await makePlan();
  const first = { id: uid(), title: 'React state', topicId, status: 'done' as const };
  const second = {
    id: uid(),
    title: 'CSS Grid exercise',
    topicId: null,
    status: 'in-progress' as const,
  };
  await Promise.all([
    repository.saveRoutineItem(routineId, targetId, first),
    repository.saveRoutineItem(routineId, targetId, second),
  ]);
  // Editing the hour budget from an older form must keep newly added items.
  await repository.saveRoutineTarget(routineId, {
    id: targetId,
    categoryId,
    title: 'Frontend',
    targetMinutes: 300,
    items: [],
  });
  expect((await db.routines.get(routineId))?.targets?.[0].items).toHaveLength(2);
  const copyId = await repository.duplicateRoutine(routineId);
  const original = (await db.routines.get(routineId))!;
  const copy = (await db.routines.get(copyId!))!;
  expect(copy.targets?.[0].items.every((item) => item.status === 'todo')).toBe(true);
  expect(copy.targets?.[0].items[0].id).not.toBe(first.id);
  expect(copy.targets?.[0].id).not.toBe(targetId);
  expect(original.targets?.[0].items[0].status).toBe('done');
  const backup = validateBackup(await exportBackup());
  await restoreBackup(backup, 'replace');
  expect((await db.routines.get(routineId))?.targets).toEqual(original.targets);
  backup.routines[0].targets![0].items[0].topicId = uid();
  expect(() => validateBackup(backup)).toThrow('routine topic');
  await repository.removeRoutine(copyId!);
  expect(await db.topics.get(topicId)).toBeDefined();
  expect((await db.routines.get(routineId))?.targets?.[0].items).toHaveLength(2);
});

it('retains the routine checklist when linked library topics or categories are deleted', async () => {
  const { categoryId, topicId, routineId, targetId } = await makePlan();
  await repository.saveRoutineItem(routineId, targetId, {
    id: uid(),
    title: 'React state',
    topicId,
    status: 'done',
  });
  await repository.deleteCategory(categoryId);
  const target = (await db.routines.get(routineId))?.targets?.[0];
  expect(target?.categoryId).toBeNull();
  expect(target?.items[0]).toMatchObject({ title: 'React state', topicId: null, status: 'done' });
  validateBackup(await exportBackup());
  await expect(
    repository.saveRoutineTarget(routineId, {
      id: uid(),
      title: 'Invalid',
      categoryId: null,
      targetMinutes: 0,
      items: [],
    }),
  ).rejects.toThrow();
});

it('counts only saved focus time inside the routine dates and never counts a topic twice', () => {
  const topic = uid(),
    startDate = '2026-10-25';
  const routine: Routine = {
    id: uid(),
    title: 'Week',
    startDate,
    days: 7,
    createdAt: 0,
    targets: [
      {
        id: 'area-a',
        title: 'Frontend',
        categoryId: null,
        targetMinutes: 240,
        items: [{ id: uid(), title: 'React', topicId: topic, status: 'done' }],
      },
      {
        id: 'area-b',
        title: 'Other',
        categoryId: null,
        targetMinutes: 60,
        items: [{ id: uid(), title: 'React again', topicId: topic, status: 'todo' }],
      },
    ],
  };
  const studies = [-1, 0, 6, 7].map((offset) => ({
    id: uid(),
    topicId: topic,
    startedAt: new Date(`${addDays(startDate, offset)}T12:00:00`).getTime(),
    duration: 1800,
    note: '',
  }));
  const totals = routineFocusMinutes(routine, studies);
  expect(totals.get('area-a')).toBe(60);
  expect(totals.has('area-b')).toBe(false);
});

it('upgrades existing calendar routines and imports old backups into area targets without losing records', async () => {
  const name = `orbit-upgrade-${uid()}`;
  const legacy = new Dexie(name);
  legacy.version(4).stores({
    tasks: 'id, date, status, createdAt, [date+status]',
    categories: 'id, order, archived',
    topics:
      'id, categoryId, parentTopicId, status, updatedAt, openedAt, order, [categoryId+parentTopicId]',
    documents: 'id, updatedAt',
    images: 'id, topicId',
    resources: 'id, topicId, status',
    routines: 'id, startDate',
    scheduled: 'id, routineId, topicId, date',
    studies: 'id, topicId, startedAt',
    preferences: 'id',
  });
  const categoryId = uid(),
    topicId = uid(),
    routineId = uid(),
    startDate = localDate();
  const category = {
    id: categoryId,
    title: 'Frontend',
    color: '#a897f9',
    order: 0,
    archived: false,
  };
  const topic = {
    id: topicId,
    categoryId,
    parentTopicId: null,
    title: 'React state',
    status: 'todo',
    order: 0,
    archived: false,
    createdAt: 0,
    updatedAt: 0,
    openedAt: 0,
  };
  await legacy.table('categories').add(category);
  await legacy.table('topics').add(topic);
  await legacy
    .table('routines')
    .add({ id: routineId, title: 'Original week', startDate, days: 7, createdAt: 123 });
  await legacy
    .table('scheduled')
    .bulkAdd(
      [true, false].map((completed, index) => ({
        id: uid(),
        topicId,
        routineId,
        date: addDays(startDate, index),
        time: '09:00',
        duration: 120,
        completed,
      })),
    );
  legacy.close();
  const upgraded = new OrbitDB(name);
  try {
    await upgraded.open();
    const routine = (await upgraded.routines.get(routineId))!;
    expect(routine.createdAt).toBe(123);
    expect(routine.targets?.[0]).toMatchObject({ title: 'Frontend', targetMinutes: 240 });
    expect(routine.targets?.[0].items).toHaveLength(1);
    expect(routine.targets?.[0].items[0].status).toBe('in-progress');
    expect(await upgraded.scheduled.count()).toBe(2);
    const backup = await exportBackup();
    backup.categories = [category];
    backup.topics = [topic as (typeof backup.topics)[number]];
    backup.documents = [
      {
        id: topicId,
        text: '',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        updatedAt: 0,
      },
    ];
    backup.routines = [{ id: routineId, title: routine.title, startDate, days: 7, createdAt: 123 }];
    backup.scheduled = await upgraded.scheduled.toArray();
    await restoreBackup(backup, 'replace');
    expect((await db.routines.get(routineId))?.targets?.[0].targetMinutes).toBe(240);
  } finally {
    await upgraded.delete();
  }
});
