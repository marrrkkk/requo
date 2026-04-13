import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BusinessType } from "@/features/inquiries/business-types";

export type WorkspaceOverview = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  createdAt: Date;
  memberRole: string;
  businesses: WorkspaceBusinessSummary[];
  members: WorkspaceMemberSummary[];
};

export type WorkspaceBusinessSummary = {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  logoStoragePath: string | null;
  defaultCurrency: string;
};

export type WorkspaceMemberSummary = {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
};

export type WorkspaceSettingsView = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
};

export type WorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  memberRole: string;
  businessCount: number;
};

export type WorkspaceSettingsFieldErrors = Partial<
  Record<"name", string[] | undefined>
>;

export type WorkspaceSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: WorkspaceSettingsFieldErrors;
};

export type CreateWorkspaceActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"name", string[] | undefined>>;
};
