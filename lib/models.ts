import type { JSONContent } from '@tiptap/react';
export type Status = 'todo' | 'learning' | 'done';
export interface Category {
  id: string;
  title: string;
  color: string;
  order: number;
  archived: boolean;
}
export interface Topic {
  id: string;
  categoryId: string;
  parentTopicId: string | null;
  title: string;
  status: Status;
  order: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  openedAt: number;
}
export interface TopicDocument {
  id: string;
  content: JSONContent;
  text: string;
  updatedAt: number;
}
export interface ImageAsset {
  id: string;
  topicId: string;
  blob: Blob;
  name: string;
}
export type ResourceType = 'YouTube' | 'Course' | 'Article' | 'Documentation' | 'GitHub' | 'Other';
export interface Resource {
  id: string;
  topicId: string;
  title: string;
  url: string;
  type: ResourceType;
  note: string;
  status: Status;
  position: number;
  resumeNote: string;
  duration: number;
  lastVisited: number;
}
export interface Routine {
  id: string;
  title: string;
  startDate: string;
  days: number;
  createdAt: number;
  targets?: RoutineTarget[];
}
export interface RoutineItem {
  id: string;
  title: string;
  topicId: string | null;
  status: TaskStatus;
}
export interface RoutineTarget {
  id: string;
  title: string;
  categoryId: string | null;
  targetMinutes: number;
  items: RoutineItem[];
}
export interface ScheduledSession {
  id: string;
  routineId: string;
  topicId: string;
  date: string;
  time: string;
  duration: number;
  completed: boolean;
}
export interface StudySession {
  id: string;
  topicId: string;
  startedAt: number;
  duration: number;
  note: string;
}
export interface TimerState {
  topicId: string;
  startedAt: number;
  runningSince: number | null;
  elapsed: number;
  target: number;
}
export interface Preference {
  id: string;
  value: unknown;
}
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export interface Task {
  id: string;
  title: string;
  details: string;
  date: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}
export interface Workspace {
  tasks: Task[];
  categories: Category[];
  topics: Topic[];
  documents: TopicDocument[];
  resources: Resource[];
  routines: Routine[];
  scheduled: ScheduledSession[];
  studies: StudySession[];
}
export const COLORS = ['#a897f9', '#74c7cb', '#d7b57a', '#e197b3', '#89b496', '#8aaee5'];
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function readableTime(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds));
  return n >= 3600
    ? `${Math.floor(n / 3600)}:${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
    : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}
export function safeUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Use a valid http or https URL.');
  return url.href;
}
export function resumeUrl(resource: Resource): string {
  const url = new URL(safeUrl(resource.url));
  if (resource.type === 'YouTube' && /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname))
    url.searchParams.set('t', String(Math.floor(resource.position)));
  return url.href;
}
export function descendants(topics: Topic[], id: string): string[] {
  const result = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of topics)
      if (t.parentTopicId && result.has(t.parentTopicId) && !result.has(t.id)) {
        result.add(t.id);
        changed = true;
      }
  }
  return [...result];
}
export function elapsedSeconds(timer: TimerState, now = Date.now()): number {
  return timer.elapsed + (timer.runningSince ? Math.max(0, (now - timer.runningSince) / 1000) : 0);
}

export function imageReferences(content: JSONContent): Set<string> {
  const result = new Set<string>();
  const visit = (node: JSONContent) => {
    if (
      node.type === 'image' &&
      typeof node.attrs?.src === 'string' &&
      node.attrs.src.startsWith('orbit-image:')
    )
      result.add(node.attrs.src.slice(12));
    node.content?.forEach(visit);
  };
  visit(content);
  return result;
}
