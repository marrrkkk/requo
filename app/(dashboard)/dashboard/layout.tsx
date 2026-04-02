import { requireSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/shell/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
