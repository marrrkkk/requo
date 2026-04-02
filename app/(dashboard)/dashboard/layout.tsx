import { bootstrapWorkspaceForUser } from "@/lib/auth/workspace-bootstrap";
import { requireSession } from "@/lib/auth/session";
import { DashboardAccessFallback } from "@/components/shell/dashboard-access-fallback";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { getWorkspaceContextForUser } from "@/lib/db/workspace-access";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  await bootstrapWorkspaceForUser(session.user);
  const workspaceContext = await getWorkspaceContextForUser(session.user.id);

  if (!workspaceContext) {
    return <DashboardAccessFallback user={session.user} />;
  }

  return (
    <DashboardShell user={session.user} workspaceContext={workspaceContext}>
      {children}
    </DashboardShell>
  );
}
