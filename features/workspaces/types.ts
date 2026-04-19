import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BusinessRecordState } from "@/features/businesses/lifecycle";
import type { BusinessType } from "@/features/inquiries/business-types";
import type {
  BillingProvider,
  SubscriptionStatus,
} from "@/lib/billing/types";
import type { WorkspaceDeletionState } from "@/features/workspaces/deletion";

export type WorkspaceOverview = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  createdAt: Date;
  scheduledDeletionAt: Date | null;
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
  recordState: BusinessRecordState;
  archivedAt: Date | null;
  deletedAt: Date | null;
  viewerRole: string | null;
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
  scheduledDeletionAt: Date | null;
  memberRole: string;
};

export type WorkspaceDeletionSubscriptionView = {
  status: SubscriptionStatus;
  canceledAt: Date | null;
  currentPeriodEnd: Date | null;
  billingProvider: BillingProvider | null;
  providerSubscriptionId: string | null;
};

export type WorkspaceDeletionBlocker = {
  code:
    | "owner_only"
    | "subscription_cancellation_required"
    | "subscription_state_unresolved";
  message: string;
};

export type WorkspaceDeletionPreflight = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  state: WorkspaceDeletionState;
  scheduledDeletionAt: Date | null;
  effectiveDeletionAt: Date | null;
  canRequestDeletion: boolean;
  canCancelScheduledDeletion: boolean;
  activeBusinessCount: number;
  businessCount: number;
  memberCount: number;
  subscription: WorkspaceDeletionSubscriptionView | null;
  blockers: WorkspaceDeletionBlocker[];
};

export type WorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  scheduledDeletionAt: Date | null;
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

export type WorkspaceDeletionActionState = {
  error?: string;
  success?: string;
};

export type CreateWorkspaceActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"name", string[] | undefined>>;
};
