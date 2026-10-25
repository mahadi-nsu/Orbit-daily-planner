import { z } from 'zod';
import {
  addDays,
  localDate,
  type Category,
  type Routine,
  type RoutineTarget,
  type ScheduledSession,
  type StudySession,
  type Topic,
} from './models';

export const routineItemSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(300),
  topicId: z.uuid().nullable(),
  status: z.enum(['todo', 'in-progress', 'done']),
});
export const routineTargetSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(200),
  categoryId: z.uuid().nullable(),
  targetMinutes: z.number().int().min(1),
  items: z.array(routineItemSchema),
});
export const routineSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startDate: z.iso.date(),
  days: z.number().int().min(1).max(3650),
});
export function hoursLabel(minutes: number) {
  return `${Number((minutes / 60).toFixed(2))}h`;
}

// Keep existing plans when moving from calendar slots to area-based targets.
export function targetsFromSessions(
  routineId: string,
  sessions: ScheduledSession[],
  topics: Topic[],
  categories: Category[],
): RoutineTarget[] {
  const result: RoutineTarget[] = [];
  for (const session of sessions.filter((s) => s.routineId === routineId)) {
    const topic = topics.find((t) => t.id === session.topicId);
    if (!topic) continue;
    let target = result.find((t) => t.categoryId === topic.categoryId);
    if (!target) {
      target = {
        id: session.id,
        title: categories.find((c) => c.id === topic.categoryId)?.title || 'Learning',
        categoryId: topic.categoryId,
        targetMinutes: 0,
        items: [],
      };
      result.push(target);
    }
    target.targetMinutes += session.duration;
    if (!target.items.some((i) => i.topicId === topic.id)) {
      const related = sessions.filter((s) => s.routineId === routineId && s.topicId === topic.id);
      target.items.push({
        id: session.id,
        title: topic.title,
        topicId: topic.id,
        status: related.every((s) => s.completed)
          ? 'done'
          : related.some((s) => s.completed)
            ? 'in-progress'
            : 'todo',
      });
    }
  }
  return result;
}

// A completed checkbox represents coverage; focus sessions represent actual time.
// Resolve each linked topic to one area so its time is never counted twice.
export function routineFocusMinutes(
  routine: Routine,
  studies: StudySession[],
): Map<string, number> {
  const totals = new Map<string, number>();
  const owners = new Map<string, string>();
  for (const target of routine.targets || [])
    for (const item of target.items) {
      if (item.topicId && !owners.has(item.topicId)) owners.set(item.topicId, target.id);
    }
  const endDate = addDays(routine.startDate, routine.days - 1);
  for (const study of studies) {
    const date = localDate(new Date(study.startedAt)),
      owner = owners.get(study.topicId);
    if (owner && date >= routine.startDate && date <= endDate)
      totals.set(owner, (totals.get(owner) || 0) + study.duration / 60);
  }
  return totals;
}
