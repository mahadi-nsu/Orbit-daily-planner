import { WorkspaceApp } from '@/features/workspace/workspace-app';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceApp initialView="topic" initialTopic={id} />;
}
