"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Building2,
  Clock,
  FileText,
  GraduationCap,
  Inbox,
  Lock,
  Monitor,
  Moon,
  PencilRuler,
  Search,
  Sparkles,
  Sun,
  Tags,
  Upload,
  UserPlus,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/base/notification/notify";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getBusinessFollowUpsPath,
  getBusinessServicesPath,
  getBusinessAiSettingsPath,
  getBusinessMembersPath,
  getBusinessNewInquiryPath,
  getBusinessNewQuotePath,
  getBusinessProductsPath,
  getBusinessPublicChatPath,
  getBusinessAssistantPath,
  newBusinessPath,
} from "@/features/businesses/routes";
import { useTheme } from "@/components/theme-provider";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import {
  canManageBusinessMembers,
  canManageOperationalBusinessSettings,
  type BusinessMemberRole,
} from "@/lib/business-members";
import { hasFeatureAccess, type PlanFeature } from "@/lib/plans/entitlements";
import {
  getRequiredPlanLabel,
  getUpgradeDescription,
} from "@/features/paywall/lib/utils";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import {
  clearDashboardTourLocalStorage,
  DASHBOARD_TOUR_DEV_SHOW_EVENT,
} from "@/features/onboarding/tour-keys";
import { getBusinessDashboardPath } from "@/features/businesses/routes";

export const OPEN_COMMAND_MENU_EVENT = "requo:open-command-menu";

export function openGlobalCommandMenu() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_MENU_EVENT));
}

type CommandMenuProps = {
  businessSlug: string;
  businessId: string;
  userId: string;
  role: BusinessMemberRole;
  plan: plan;
  /** Controlled open state (for triggering from the sidebar Quick Search). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hides the inline trigger button; only the dialog renders. */
  hideTrigger?: boolean;
};

type CreateAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  navigate: () => void;
  /** Plan feature that gates this action, if any. */
  feature?: PlanFeature;
  /** Whether the current role is allowed to see this action. */
  visible: boolean;
};

export function CommandMenu({
  businessSlug,
  businessId,
  userId,
  role,
  plan,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: CommandMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const [lockedAction, setLockedAction] = React.useState<CreateAction | null>(
    null,
  );
  const router = useRouter();
  const { setTheme } = useTheme();

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const canOperate = canManageOperationalBusinessSettings(role);
  const canManageMembers = canManageBusinessMembers(role);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [handleOpenChange, open]);

  React.useEffect(() => {
    const handler = () => handleOpenChange(true);
    window.addEventListener(OPEN_COMMAND_MENU_EVENT, handler);
    return () => window.removeEventListener(OPEN_COMMAND_MENU_EVENT, handler);
  }, [handleOpenChange]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      handleOpenChange(false);
      command();
    },
    [handleOpenChange],
  );

  function publicChatUrl() {
    return `${window.location.origin}${getBusinessPublicChatPath(businessSlug)}`;
  }

  function copyPublicChatLink() {
    void navigator.clipboard.writeText(publicChatUrl()).then(
      () => toast.success("Public chat link copied"),
      () => toast.error("Could not copy link"),
    );
  }

  function handleReplayTour() {
    clearDashboardTourLocalStorage(businessId);
    router.push(getBusinessDashboardPath(businessSlug));
    // Dispatch event after a short delay to let navigation settle
    setTimeout(() => {
      window.dispatchEvent(new Event(DASHBOARD_TOUR_DEV_SHOW_EVENT));
    }, 500);
    toast.success("Product tour restarted");
  }

  function selectCreate(action: CreateAction) {
    if (!action.feature || hasFeatureAccess(plan, action.feature)) {
      runCommand(action.navigate);
      return;
    }
    handleOpenChange(false);
    setLockedAction(action);
  }

  const createActions: CreateAction[] = [
    {
      label: "Ask Assistant",
      icon: Sparkles,
      navigate: () => router.push(getBusinessAssistantPath(businessSlug)),
      visible: true,
    },
    {
      label: "New quote",
      icon: FileText,
      navigate: () => router.push(getBusinessNewQuotePath(businessSlug)),
      visible: true,
    },
    {
      label: "New inquiry",
      icon: Inbox,
      navigate: () => router.push(getBusinessNewInquiryPath(businessSlug)),
      visible: true,
    },
    {
      label: "New follow-up",
      icon: Clock,
      navigate: () => router.push(getBusinessFollowUpsPath(businessSlug)),
      feature: "followUps",
      visible: true,
    },
    {
      label: "Invite team member",
      icon: UserPlus,
      navigate: () => router.push(getBusinessMembersPath(businessSlug)),
      feature: "members",
      visible: canManageMembers,
    },
    {
      label: "New product",
      icon: Tags,
      navigate: () => router.push(getBusinessProductsPath(businessSlug)),
      feature: "quoteLibrary",
      visible: canOperate,
    },
    {
      label: "Create service",
      icon: PencilRuler,
      navigate: () => router.push(getBusinessServicesPath(businessSlug)),
      visible: canOperate,
    },
    {
      label: "Import products (AI)",
      icon: Upload,
      navigate: () => router.push(getBusinessProductsPath(businessSlug)),
      feature: "aiQuoteDrafting",
      visible: canOperate,
    },
    {
      label: "Add knowledge base entry",
      icon: BookOpen,
      navigate: () =>
        router.push(`${getBusinessAiSettingsPath(businessSlug)}#knowledge`),
      feature: "knowledgeBase",
      visible: canOperate,
    },
    {
      label: "Create new business",
      icon: Building2,
      navigate: () => router.push(newBusinessPath),
      visible: true,
    },
  ];

  const visibleCreateActions = createActions.filter((action) => action.visible);

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 md:w-64 lg:w-80"
        >
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0" />
            <span className="truncate">Quick actions…</span>
          </div>
          <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="p-0 sm:max-w-[560px]"
          showCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Quick actions</DialogTitle>
          <DialogDescription className="sr-only">
            Create records, copy links, and toggle theme.
          </DialogDescription>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <CommandInput placeholder="Search actions…" />
            <CommandList className="no-scrollbar max-h-72 overflow-y-auto">
              <CommandEmpty>No matching actions.</CommandEmpty>

              <CommandGroup heading="Create">
                {visibleCreateActions.map((action) => {
                  const Icon = action.icon;
                  const locked =
                    action.feature && !hasFeatureAccess(plan, action.feature);
                  return (
                    <CommandItem
                      key={action.label}
                      onSelect={() => selectCreate(action)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{action.label}</span>
                      {locked ? (
                        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-70">
                          <Lock className="size-3" aria-hidden="true" />
                          {getRequiredPlanLabel(action.feature!)}
                        </span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandGroup heading="Other">
                <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>System</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(copyPublicChatLink)}>
                  <Bot className="mr-2 h-4 w-4" />
                  <span>Copy public chat link</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(handleReplayTour)}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>Replay product tour</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lockedAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setLockedAction(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            {lockedAction ? (
              <>
                <DialogTitle className="flex items-center gap-2">
                  {getRequiredPlanLabel(lockedAction.feature!)} Plan
                </DialogTitle>
                <DialogDescription>
                  {getUpgradeDescription(lockedAction.feature!)}
                </DialogDescription>
              </>
            ) : null}
          </DialogHeader>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <UpgradeButton
              userId={userId}
              businessId={businessId}
              businessSlug={businessSlug}
              currentPlan={plan}
            >
              <Zap data-icon="inline-start" />
              Upgrade
            </UpgradeButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}