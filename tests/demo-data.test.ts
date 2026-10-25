import { beforeEach, expect, it } from 'vitest';
import { db, repository } from '@/lib/db';
import { createDemoData, loadDemoData, removeDemoData, isDemoId } from '@/lib/demo-data';
import { exportBackup, restoreBackup, validateBackup } from '@/lib/backup';
import { localDate } from '@/lib/models';

beforeEach(async () => {
  for (const table of db.tables) await table.clear();
});

it('adds a coherent sample pack once without overwriting existing entries or sample edits', async () => {
  await repository.initialize();
  const category = (await db.categories.toArray())[0];
  const personal = await repository.createTopic('My own notes', category.id);
  const task = await repository.createTask({ title: 'My personal task', date: localDate() });
  await Promise.all([loadDemoData(), loadDemoData()]);
  expect(await db.categories.count()).toBe(4);
  expect(await db.tasks.count()).toBe(14);
  expect(await db.topics.count()).toBe(13);
  const sample = (await db.topics.toArray()).find((t) => isDemoId(t.id))!;
  await db.topics.update(sample.id, { title: 'My edited demo title' });
  await loadDemoData();
  await loadDemoData(true);
  expect((await db.topics.get(sample.id))?.title).toBe('My edited demo title');
  expect((await db.topics.get(personal))?.title).toBe('My own notes');
  expect((await db.tasks.get(task))?.title).toBe('My personal task');
  expect(await db.topics.count()).toBe(13);
  const backup = validateBackup(await exportBackup());
  expect(backup.scheduled).toHaveLength(15);
  expect(backup.resources).toHaveLength(12);
  expect(backup.studies).toHaveLength(12);
  await restoreBackup(backup, 'replace');
  await loadDemoData();
  expect(await db.tasks.count()).toBe(14);
});

it('removes only demo records, preserves user dependencies, and respects removal on later visits', async () => {
  await repository.initialize();
  await loadDemoData();
  const parent = (await db.topics.toArray()).find((t) => t.parentTopicId)!;
  const child = await repository.createTopic('My extra exercise', parent.categoryId, parent.id);
  const task = await repository.createTask({ title: 'Keep this task', date: localDate() });
  const sampleRoutine = (await db.routines.toArray())[0];
  await repository.schedule({
    id: crypto.randomUUID(),
    routineId: sampleRoutine.id,
    topicId: child,
    date: localDate(),
    time: '12:00',
    duration: 25,
    completed: false,
  });
  await removeDemoData();
  await loadDemoData();
  expect(await db.tasks.count()).toBe(1);
  expect((await db.tasks.get(task))?.title).toBe('Keep this task');
  expect((await db.topics.get(child))?.parentTopicId).toBe(parent.id);
  expect(await db.topics.get(parent.id)).toBeDefined();
  expect(await db.routines.get(sampleRoutine.id)).toBeDefined();
  expect(await db.resources.count()).toBe(0);
  expect(await db.studies.count()).toBe(0);
  validateBackup(await exportBackup());
  await loadDemoData(true);
  expect(await db.tasks.count()).toBe(14);
  expect((await db.topics.get(child))?.title).toBe('My extra exercise');
  validateBackup(await exportBackup());
});

it('keeps sample dates relative, history in the past, and imported personal backups free of demo additions', async () => {
  const now = new Date('2026-10-25T00:30:00');
  const pack = createDemoData(
    [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
    now,
  );
  expect(pack.tasks.filter((t) => t.date === localDate(now))).toHaveLength(6);
  expect(pack.studies.every((s) => s.startedAt + s.duration * 1000 <= now.getTime())).toBe(true);
  expect(pack.tasks.every((t) => !t.completedAt || t.completedAt <= now.getTime())).toBe(true);
  const personal = await repository.createTask({ title: 'Only my data', date: localDate() });
  const backup = await exportBackup();
  await restoreBackup(backup, 'replace');
  await loadDemoData();
  expect(await db.topics.count()).toBe(0);
  expect((await db.tasks.toArray()).map((t) => t.id)).toEqual([personal]);
});

it('keeps personal routine items and their linked notes when removing the sample pack', async () => {
  await repository.initialize();
  await loadDemoData();
  const sample = (await db.routines.toArray())[0];
  const target = sample.targets![0];
  const topicId = target.items[0].topicId!;
  const ownItem = {
    id: crypto.randomUUID(),
    title: 'My extra practice',
    topicId: null,
    status: 'todo' as const,
  };
  await repository.saveRoutineItem(sample.id, target.id, ownItem);
  const ownRoutine = await repository.saveRoutine({
    title: 'Keep my plan',
    startDate: localDate(),
    days: 7,
  });
  const ownTarget = {
    id: crypto.randomUUID(),
    title: 'Frontend',
    categoryId: target.categoryId,
    targetMinutes: 240,
    items: [],
  };
  await repository.saveRoutineTarget(ownRoutine, ownTarget);
  await repository.saveRoutineItem(ownRoutine, ownTarget.id, {
    id: crypto.randomUUID(),
    title: 'My linked topic',
    topicId,
    status: 'in-progress',
  });
  await removeDemoData();
  expect((await db.routines.get(sample.id))?.targets?.[0].items).toEqual([ownItem]);
  expect((await db.routines.get(ownRoutine))?.targets?.[0].items[0].topicId).toBe(topicId);
  expect(await db.topics.get(topicId)).toBeDefined();
  validateBackup(await exportBackup());
});
