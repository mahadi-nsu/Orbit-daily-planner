import { z } from 'zod';
import { db } from './db';
import { safeUrl } from './models';
import { DEMO_PREFERENCE, isDemoId } from './demo-data';
import { routineTargetSchema, targetsFromSessions } from './routine-plan';
const id = z.uuid(),
  num = z.number().finite().nonnegative(),
  text = z.string().max(1_000_000),
  status = z.enum(['todo', 'learning', 'done']);
const schemas = {
  // Backups made before the task list was added remain importable.
  tasks: z
    .array(
      z.object({
        id,
        title: z.string().trim().min(1).max(300),
        details: z.string().max(20_000),
        date: z.iso.date(),
        status: z.enum(['todo', 'in-progress', 'done']),
        createdAt: num,
        updatedAt: num,
        completedAt: num.nullable(),
      }),
    )
    .default([]),
  categories: z.array(
    z.object({
      id,
      title: z.string().trim().min(1).max(200),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      order: num,
      archived: z.boolean(),
    }),
  ),
  topics: z.array(
    z.object({
      id,
      categoryId: id,
      parentTopicId: id.nullable(),
      title: z.string().trim().min(1).max(300),
      status,
      order: num,
      archived: z.boolean(),
      createdAt: num,
      updatedAt: num,
      openedAt: num,
    }),
  ),
  documents: z.array(
    z.object({ id, content: z.record(z.string(), z.unknown()), text, updatedAt: num }),
  ),
  resources: z.array(
    z.object({
      id,
      topicId: id,
      title: z.string().min(1).max(300),
      url: z.string().refine((v) => {
        try {
          safeUrl(v);
          return true;
        } catch {
          return false;
        }
      }, 'Invalid resource URL'),
      type: z.enum(['YouTube', 'Course', 'Article', 'Documentation', 'GitHub', 'Other']),
      note: text,
      status,
      position: num,
      resumeNote: text,
      duration: num,
      lastVisited: num,
    }),
  ),
  routines: z.array(
    z.object({
      id,
      title: z.string().min(1).max(200),
      startDate: z.iso.date(),
      days: z.number().int().min(1).max(3650),
      createdAt: num,
      targets: z.array(routineTargetSchema).optional(),
    }),
  ),
  scheduled: z.array(
    z.object({
      id,
      routineId: id,
      topicId: id,
      date: z.iso.date(),
      time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
      duration: z.number().int().min(1).max(1440),
      completed: z.boolean(),
    }),
  ),
  studies: z.array(z.object({ id, topicId: id, startedAt: num, duration: num, note: text })),
  images: z.array(
    z.object({
      id,
      topicId: id,
      name: text,
      mime: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
      data: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/),
    }),
  ),
};
const backupSchema = z.object({
  format: z.literal('orbit'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  ...schemas,
});
export type Backup = z.infer<typeof backupSchema>;
const allowedNodes = new Set([
  'doc',
  'paragraph',
  'heading',
  'text',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'blockquote',
  'horizontalRule',
  'hardBreak',
  'codeBlock',
  'image',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
]);
function validateNode(node: unknown, imageIds: Set<string>, depth = 0): void {
  if (depth > 100) throw new Error('Document nesting is too deep.');
  if (!node || typeof node !== 'object') throw new Error('Invalid document.');
  const n = node as Record<string, unknown>;
  if (typeof n.type !== 'string' || !allowedNodes.has(n.type))
    throw new Error('Unsupported document block.');
  if (n.type === 'image') {
    const src = (n.attrs as Record<string, unknown>)?.src;
    if (typeof src !== 'string' || !src.startsWith('orbit-image:') || !imageIds.has(src.slice(12)))
      throw new Error('Backup contains a missing image.');
  }
  if (Array.isArray(n.marks))
    for (const m of n.marks) {
      if (m.type === 'link') safeUrl(m.attrs?.href);
    }
  if (n.content !== undefined) {
    if (!Array.isArray(n.content)) throw new Error('Invalid document content.');
    for (const child of n.content) validateNode(child, imageIds, depth + 1);
  }
}
export function validateBackup(value: unknown): Backup {
  const b = backupSchema.parse(value);
  for (const key of Object.keys(schemas) as (keyof typeof schemas)[]) {
    const rows = b[key];
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error('Duplicate identifiers in backup.');
  }
  const cats = new Set(b.categories.map((c) => c.id)),
    topics = new Map(b.topics.map((t) => [t.id, t])),
    routines = new Map(b.routines.map((r) => [r.id, r]));
  for (const t of b.topics) {
    if (!cats.has(t.categoryId)) throw new Error('A topic references a missing category.');
    const seen = new Set([t.id]);
    let p = t.parentTopicId;
    while (p) {
      if (seen.has(p)) throw new Error('Circular topic hierarchy in backup.');
      seen.add(p);
      const parent = topics.get(p);
      if (!parent || parent.categoryId !== t.categoryId) throw new Error('Invalid parent topic.');
      p = parent.parentTopicId;
    }
  }
  for (const row of [...b.resources, ...b.images, ...b.studies, ...b.scheduled])
    if (!topics.has(row.topicId)) throw new Error('Missing topic reference.');
  for (const s of b.scheduled)
    if (!routines.has(s.routineId)) throw new Error('Missing routine reference.');
  for (const routine of b.routines) {
    const targetIds = new Set<string>(),
      itemIds = new Set<string>();
    for (const target of routine.targets || []) {
      if (targetIds.has(target.id)) throw new Error('Duplicate routine target.');
      targetIds.add(target.id);
      if (target.categoryId && !cats.has(target.categoryId))
        throw new Error('Missing routine category reference.');
      for (const item of target.items) {
        if (itemIds.has(item.id)) throw new Error('Duplicate routine item.');
        itemIds.add(item.id);
        if (item.topicId && !topics.has(item.topicId))
          throw new Error('Missing routine topic reference.');
      }
    }
  }
  if (
    b.documents.length !== b.topics.length ||
    new Set(b.documents.map((d) => d.id)).size !== b.topics.length
  )
    throw new Error('Each topic must have one independent document.');
  const imgs = new Set(b.images.map((i) => i.id));
  for (const d of b.documents) {
    if (!topics.has(d.id)) throw new Error('Orphan document.');
    validateNode(d.content, imgs);
  }
  return b;
}
function blobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
export async function exportBackup(): Promise<Backup> {
  const [categories, topics, documents, resources, routines, scheduled, studies, images, tasks] =
    await db.transaction(
      'r',
      [
        db.categories,
        db.topics,
        db.documents,
        db.resources,
        db.routines,
        db.scheduled,
        db.studies,
        db.images,
        db.tasks,
      ],
      () =>
        Promise.all([
          db.categories.toArray(),
          db.topics.toArray(),
          db.documents.toArray(),
          db.resources.toArray(),
          db.routines.toArray(),
          db.scheduled.toArray(),
          db.studies.toArray(),
          db.images.toArray(),
          db.tasks.toArray(),
        ]),
    );
  return {
    format: 'orbit',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    topics,
    documents,
    resources,
    routines,
    scheduled,
    studies,
    tasks,
    images: await Promise.all(
      images.map(async (i) => ({
        id: i.id,
        topicId: i.topicId,
        name: i.name,
        mime: i.blob.type as Backup['images'][number]['mime'],
        data: await blobBase64(i.blob),
      })),
    ),
  };
}
export async function restoreBackup(input: unknown, mode: 'merge' | 'replace') {
  const b = validateBackup(input);
  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') {
      for (const table of db.tables) await table.clear();
    } else {
      for (const key of Object.keys(schemas) as (keyof typeof schemas)[])
        for (const row of b[key])
          if (await db.table(key).get(row.id))
            throw new Error(
              'This backup overlaps existing data. Choose Replace or import into an empty workspace.',
            );
    }
    await db.tasks.bulkAdd(b.tasks);
    await db.categories.bulkAdd(b.categories);
    await db.topics.bulkAdd(b.topics);
    await db.documents.bulkAdd(b.documents);
    await db.resources.bulkAdd(b.resources);
    await db.routines.bulkAdd(
      b.routines.map((routine) => ({
        ...routine,
        targets:
          routine.targets ?? targetsFromSessions(routine.id, b.scheduled, b.topics, b.categories),
      })),
    );
    await db.scheduled.bulkAdd(b.scheduled);
    await db.studies.bulkAdd(b.studies);
    await db.images.bulkAdd(
      b.images.map((i) => ({
        id: i.id,
        topicId: i.topicId,
        name: i.name,
        blob: new Blob([Uint8Array.from(atob(i.data), (c) => c.charCodeAt(0))], { type: i.mime }),
      })),
    );
    await db.preferences.put({ id: 'initialized', value: true });
    // Opening a restored workspace must not insert an unsolicited sample pack.
    await db.preferences.put({
      id: DEMO_PREFERENCE,
      value: (await db.topics.toArray()).some((topic) => isDemoId(topic.id)) ? 'loaded' : 'removed',
    });
  });
}
