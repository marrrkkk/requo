import type { ReactNode } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";

type BusinessSettingsLayoutProps = {
  children: ReactNode;
};

export default async function BusinessSettingsLayout({
  children,
}: BusinessSettingsLayoutProps) {
  return (
    <DashboardPage>
      <div className="min-w-0">{children}</div>
    </DashboardPage>
  );
}
