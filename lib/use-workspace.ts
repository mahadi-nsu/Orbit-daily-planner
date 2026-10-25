'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Workspace } from './models';
export function useWorkspace(): Workspace | undefined {
  return useLiveQuery(async () => {
    const [categories, topics, documents, resources, routines, scheduled, studies, tasks] =
      await Promise.all([
        db.categories.orderBy('order').toArray(),
        db.topics.orderBy('order').toArray(),
        db.documents.toArray(),
        db.resources.toArray(),
        db.routines.toArray(),
        db.scheduled.toArray(),
        db.studies.toArray(),
        db.tasks.toArray(),
      ]);
    return { categories, topics, documents, resources, routines, scheduled, studies, tasks };
  }, []);
}
