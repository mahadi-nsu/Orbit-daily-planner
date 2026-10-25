import { notFound } from 'next/navigation';
import { WorkspaceApp } from '@/features/workspace/workspace-app';
export default async function Page({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!['library', 'planner', 'progress', 'settings'].includes(view)) notFound();
  return <WorkspaceApp initialView={view} />;
}
