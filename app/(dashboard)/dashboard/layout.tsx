import { bootstrapWorkspaceForUser } from "@/lib/auth/workspace-bootstrap";
import { requireSession } from "@/lib/auth/session";
import { requireWorkspaceContextForUser } from "@/lib/db/workspace-access";
import { DashboardShell } from "@/components/shell/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  await bootstrapWorkspaceForUser(session.user);
  const workspaceContext = await requireWorkspaceContextForUser(session.user.id);

  return (
    <DashboardShell user={session.user} workspace={workspaceContext.workspace}>
      {children}
    </DashboardShell>
  );
}
