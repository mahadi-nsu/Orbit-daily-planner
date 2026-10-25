import { beforeEach, describe, expect, it } from 'vitest';
import { db, repository, uid } from '@/lib/db';
import { addDays, localDate, resumeUrl, safeUrl } from '@/lib/models';
import { exportBackup, restoreBackup, validateBackup } from '@/lib/backup';
beforeEach(async () => {
  for (const table of db.tables) await table.clear();
});
describe('learning hierarchy and independent notes', () => {
  it('initializes once and creates nested topics with independent parent and child notes', async () => {
    await Promise.all([repository.initialize(), repository.initialize()]);
    expect(await db.categories.count()).toBe(4);
    const category = await repository.createCategory('Security', '#a897f9');
    const parent = await repository.createTopic('XSS', category),
      child = await repository.createTopic('Stored XSS', category, parent),
      nested = await repository.createTopic('Mitigation', category, child);
    await repository.saveDocument(
      parent,
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Parent notes' }] }],
      },
      'Parent notes',
    );
    await repository.saveDocument(
      child,
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Child notes' }] }],
      },
      'Child notes',
    );
    expect((await db.documents.get(parent))?.text).toBe('Parent notes');
    expect((await db.documents.get(child))?.text).toBe('Child notes');
    expect((await db.topics.get(nested))?.parentTopicId).toBe(child);
    await expect(repository.moveTopic(parent, category, nested)).rejects.toThrow('descendants');
  });
  it('moves an entire branch and deletes only its own notes, images, and references', async () => {
    const cat = await repository.createCategory('A', '#a897f9'),
      other = await repository.createCategory('B', '#74c7cb');
    const parent = await repository.createTopic('Parent', cat),
      child = await repository.createTopic('Child', cat, parent),
      kept = await repository.createTopic('Keep', cat);
    await db.images.add({
      id: uid(),
      topicId: child,
      name: 'test.png',
      blob: new Blob(['x'], { type: 'image/png' }),
    });
    await repository.moveTopic(parent, other, null);
    expect((await db.topics.get(child))?.categoryId).toBe(other);
    await repository.deleteTopic(parent);
    expect(await db.topics.count()).toBe(1);
    expect((await db.documents.get(kept))?.id).toBe(kept);
    expect(await db.images.count()).toBe(0);
    await repository.saveDocument(child, { type: 'doc' }, 'late autosave');
    expect(await db.documents.count()).toBe(1);
  });
  it('archives nested topics together and restores without deleting notes', async () => {
    const cat = await repository.createCategory('A', '#a897f9'),
      parent = await repository.createTopic('Parent', cat),
      child = await repository.createTopic('Child', cat, parent);
    await repository.archiveTopic(parent, true);
    expect((await db.topics.get(child))?.archived).toBe(true);
    await repository.archiveTopic(parent, false);
    expect((await db.topics.get(child))?.archived).toBe(false);
    expect(await db.documents.count()).toBe(2);
  });
});
describe('routine and focus persistence', () => {
  it('schedules the existing topic, extends to 14 days without losing sessions, and duplicates', async () => {
    const cat = await repository.createCategory('A', '#a897f9'),
      topicId = await repository.createTopic('React', cat),
      routineId = uid(),
      sessionId = uid();
    await db.routines.add({
      id: routineId,
      title: 'Seven days',
      startDate: localDate(),
      days: 7,
      createdAt: Date.now(),
    });
    await repository.schedule({
      id: sessionId,
      topicId,
      routineId,
      date: localDate(),
      time: '09:00',
      duration: 25,
      completed: true,
    });
    await repository.resizeRoutine(routineId, 14);
    expect((await db.routines.get(routineId))?.days).toBe(14);
    expect((await db.scheduled.get(sessionId))?.completed).toBe(true);
    const copy = await repository.duplicateRoutine(routineId);
    expect(await db.scheduled.where('routineId').equals(copy!).count()).toBe(1);
    expect(await db.topics.count()).toBe(1);
    await expect(
      repository.schedule({
        id: uid(),
        topicId,
        routineId,
        date: addDays(localDate(), 14),
        time: '10:00',
        duration: 30,
        completed: false,
      }),
    ).rejects.toThrow('outside');
  });
  it('prevents concurrent timers, persists pauses, and saves actual elapsed time', async () => {
    const cat = await repository.createCategory('A', '#a897f9'),
      topicId = await repository.createTopic('React', cat);
    await repository.startTimer(topicId);
    await expect(repository.startTimer(topicId)).rejects.toThrow('current focus');
    const timer = (await db.preferences.get('timer'))!;
    await db.preferences.put({
      ...timer,
      value: { ...(timer.value as object), runningSince: Date.now() - 125000 },
    });
    await repository.toggleTimer();
    const paused = (await db.preferences.get('timer'))?.value as {
      runningSince: null;
      elapsed: number;
    };
    expect(paused.runningSince).toBeNull();
    expect(paused.elapsed).toBeGreaterThanOrEqual(125);
    await repository.finishTimer('Learned about hooks');
    expect((await db.studies.toArray())[0].duration).toBeGreaterThanOrEqual(125);
    expect((await db.studies.toArray())[0].note).toBe('Learned about hooks');
    expect(await db.preferences.get('timer')).toBeUndefined();
  });
});
describe('portable backup and safe URLs', () => {
  it('round-trips structured notes and image bytes and refuses silent overwrites', async () => {
    const cat = await repository.createCategory('Images', '#a897f9'),
      topic = await repository.createTopic('Notes', cat),
      image = uid();
    await db.images.add({
      id: image,
      topicId: topic,
      name: 'pixel.png',
      blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }),
    });
    await repository.saveDocument(
      topic,
      {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Searchable discovery' }] },
          {
            type: 'image',
            attrs: { src: `orbit-image:${image}`, caption: 'My caption', width: 60 },
          },
        ],
      },
      'Searchable discovery',
    );
    const b = await exportBackup();
    expect(validateBackup(b).images).toHaveLength(1);
    await expect(restoreBackup(b, 'merge')).rejects.toThrow('overlaps');
    expect(await db.topics.count()).toBe(1);
    await restoreBackup(b, 'replace');
    expect((await db.documents.get(topic))?.text).toBe('Searchable discovery');
    const restored = await db.images.get(image);
    expect(restored?.blob.size).toBe(4);
    expect(restored?.blob.type).toBe('image/png');
    expect((await db.documents.get(topic))?.content.content?.[1].attrs?.caption).toBe('My caption');
  });
  it('rejects missing images and circular imported hierarchies before any mutation', async () => {
    const cat = await repository.createCategory('A', '#a897f9'),
      topic = await repository.createTopic('T', cat),
      b = await exportBackup();
    b.topics[0].parentTopicId = topic;
    expect(() => validateBackup(b)).toThrow('Circular');
    expect(await db.topics.count()).toBe(1);
    b.topics[0].parentTopicId = null;
    b.documents[0].content = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: `orbit-image:${uid()}` } }],
    };
    expect(() => validateBackup(b)).toThrow('missing image');
  });
  it('rejects script URLs and formats YouTube resume positions safely', () => {
    expect(() => safeUrl('javascript:alert(1)')).toThrow();
    expect(
      resumeUrl({
        id: '',
        topicId: '',
        title: '',
        url: 'https://www.youtube.com/watch?v=test',
        type: 'YouTube',
        position: 125,
        note: '',
        status: 'learning',
        resumeNote: '',
        duration: 600,
        lastVisited: 0,
      }),
    ).toContain('t=125');
  });
});

it('preserves an image copied into another topic when deleting its original owner', async () => {
  const cat = await repository.createCategory('Notes', '#a897f9');
  const original = await repository.createTopic('Original', cat),
    copy = await repository.createTopic('Copy', cat),
    image = uid();
  await db.images.add({
    id: image,
    topicId: original,
    name: 'shared.png',
    blob: new Blob(['image'], { type: 'image/png' }),
  });
  const content = {
    type: 'doc',
    content: [{ type: 'image', attrs: { src: `orbit-image:${image}` } }],
  };
  await repository.saveDocument(original, content, '');
  await repository.saveDocument(copy, content, '');
  await repository.deleteTopic(original);
  expect((await db.images.get(image))?.topicId).toBe(copy);
  expect(validateBackup(await exportBackup()).images).toHaveLength(1);
  await repository.deleteTopic(copy);
  expect(await db.images.count()).toBe(0);
});

describe('date-wise everyday tasks', () => {
  it('creates simple tasks, validates input, and persists status/completion independently of learning topics', async () => {
    const first = await repository.createTask({
      title: '  Review pull request  ',
      date: '2026-10-25',
    });
    const second = await repository.createTask({
      title: 'Send the notes',
      details: 'Include the checklist.',
      date: '2026-10-26',
    });
    expect((await db.tasks.get(first))?.title).toBe('Review pull request');
    expect((await db.tasks.get(first))?.details).toBe('');
    expect((await db.tasks.get(first))?.status).toBe('todo');
    expect(await db.tasks.where('date').equals('2026-10-25').count()).toBe(1);
    await repository.updateTask(first, {
      title: 'Review pull request',
      details: 'Check the edge cases.',
      date: '2026-10-25',
      status: 'in-progress',
    });
    expect((await db.tasks.get(first))?.status).toBe('in-progress');
    await repository.completeTask(first, true);
    expect((await db.tasks.get(first))?.completedAt).toBeTypeOf('number');
    await repository.completeTask(first, false);
    expect((await db.tasks.get(first))?.status).toBe('todo');
    expect((await db.tasks.get(first))?.completedAt).toBeNull();
    await repository.updateTask(first, {
      title: 'Review tomorrow',
      date: '2026-10-26',
      details: 'Keep this detail.',
      status: 'todo',
    });
    expect(await db.tasks.where('date').equals('2026-10-25').count()).toBe(0);
    expect(await db.tasks.where('date').equals('2026-10-26').count()).toBe(2);
    await expect(repository.createTask({ title: '   ', date: '2026-10-25' })).rejects.toThrow();
    await expect(
      repository.createTask({ title: 'Invalid date', date: '2026-02-30' }),
    ).rejects.toThrow();
    await repository.deleteTask(first);
    expect((await db.tasks.get(second))?.details).toBe('Include the checklist.');
    expect(await db.topics.count()).toBe(0);
  });
  it('includes all task dates, details, and states in backup/restore, and accepts older task-free backups', async () => {
    const task = await repository.createTask({
      title: 'Prepare a plan',
      details: 'Three small steps.\nKeep it practical.',
      date: '2026-10-25',
      status: 'done',
    });
    const backup = await exportBackup();
    expect(backup.tasks).toHaveLength(1);
    await expect(restoreBackup(backup, 'merge')).rejects.toThrow('overlaps');
    await repository.deleteTask(task);
    await restoreBackup(backup, 'replace');
    expect((await db.tasks.get(task))?.details).toContain('Three small steps.');
    expect((await db.tasks.get(task))?.status).toBe('done');
    expect((await db.tasks.get(task))?.date).toBe('2026-10-25');
    const { tasks: omitted, ...legacy } = backup;
    expect(omitted).toHaveLength(1);
    expect(validateBackup(legacy).tasks).toEqual([]);
    await restoreBackup(legacy, 'replace');
    expect(await db.tasks.count()).toBe(0);
  });
});
