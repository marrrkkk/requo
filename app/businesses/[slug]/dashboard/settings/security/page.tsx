import { headers } from "next/headers";

import { PageHeader } from "@/components/shared/page-header";
import {
  changeAccountPasswordAction,
  deleteAccountAction,
  revokeOtherSessionsAction,
  setAccountPasswordAction,
} from "@/features/account/actions";
import { SecuritySettingsForm } from "@/features/account/components/security-settings-form";
import { getAccountSecurityForUser } from "@/features/account/queries";
import { auth } from "@/lib/auth/server";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BusinessSecuritySettingsPage() {
  const { user } = await getBusinessOwnerPageContext();
  const [security, sessions] = await Promise.all([
    getAccountSecurityForUser(user.id, user.email),
    auth.api.listSessions({
      headers: await headers(),
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Security"
        description="Password sign-in, active sessions, and account deletion."
      />

      <SecuritySettingsForm
        changePasswordAction={changeAccountPasswordAction}
        deleteAccountAction={deleteAccountAction}
        revokeOtherSessionsAction={revokeOtherSessionsAction}
        security={{
          ...security,
          activeSessionCount: sessions.length,
        }}
        setPasswordAction={setAccountPasswordAction}
      />
    </>
  );
}
