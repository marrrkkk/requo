"use client";

import * as React from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Home,
  Inbox,
  LayoutGrid,
  Link2,
  LogOut,
  MessagesSquare,
  Moon,
  PanelsTopLeft,
  Plus,
  Search,
  Sun,
  Tags,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getAccountProfilePath } from "@/features/account/routes";
import {
  getBusinessAnalyticsPath,
  getBusinessDashboardPath,
  getBusinessFollowUpsPath,
  getBusinessFormsPath,
  getBusinessInquiriesExportPath,
  getBusinessInquiriesPath,
  getBusinessMembersPath,
  getBusinessNewInquiryPath,
  getBusinessQuotesExportPath,
  getBusinessQuotesPath,
  getBusinessPath,
  getBusinessSettingsPath,
  businessesHubPath,
} from "@/features/businesses/routes";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { useTheme } from "@/components/theme-provider";
import { clearPersistedThemePreference } from "@/features/theme/persistence";
import { themeUserStorageKey } from "@/features/theme/types";
import { authClient } from "@/lib/auth/client";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import {
  canManageBusinessAdministration,
  canManageBusinessMembers,
  canManageOperationalBusinessSettings,
  canViewBusinessAnalytics,
  type BusinessMemberRole,
} from "@/lib/business-members";

type CommandMenuProps = {
  businessSlug: string;
  role: BusinessMemberRole;
  plan: plan;
};

const exportNoticeTitle = "Export is a Pro feature.";
const exportNoticeDescription =
  "Upgrade to Pro to download quote and inquiry CSV exports.";

export function CommandMenu({
  businessSlug,
  role,
  plan,
}: CommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  const canOperate = canManageOperationalBusinessSettings(role);
  const canSeeAnalytics = canViewBusinessAnalytics(role);
  const canManageMembers = canManageBusinessMembers(role);
  const isBusinessOwner = canManageBusinessAdministration(role);
  const canExport = hasFeatureAccess(plan, "exports");

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const publicInquiryPath = getBusinessPublicInquiryUrl(businessSlug);

  function copyPublicInquiryLink() {
    const url = `${window.location.origin}${publicInquiryPath}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Public inquiry link copied"),
      () => toast.error("Could not copy link"),
    );
  }

  function showExportNotice() {
    toast.info(exportNoticeTitle, {
      description: exportNoticeDescription,
    });
  }

  async function handleSignOut() {
    const result = await authClient.signOut();

    if (result.error) {
      toast.error("Could not sign out");
      return;
    }

    window.localStorage.removeItem(themeUserStorageKey);
    clearPersistedThemePreference();

    window.location.assign("/login");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 md:w-64 lg:w-80"
      >
        <div className="flex items-center gap-2">
          <Search className="size-4 shrink-0" />
          <span className="truncate">Quick actions…</span>
        </div>
        <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="p-0 sm:max-w-[560px]"
          showCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Quick actions</DialogTitle>
          <DialogDescription className="sr-only">
            Create records, navigate sections, copy links, toggle theme, and more.
          </DialogDescription>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <CommandInput placeholder="Search actions…" />
            <CommandList>
              <CommandEmpty>No matching actions.</CommandEmpty>

              {/* Create */}
              <CommandGroup heading="Create">
                <CommandItem
                  onSelect={() =>
                    runCommand(() =>
                      router.push(getBusinessNewInquiryPath(businessSlug)),
                    )
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>New inquiry</span>
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    runCommand(() =>
                      router.push(`${getBusinessQuotesPath(businessSlug)}/new`),
                    )
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>New quote</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {/* Navigate */}
              <CommandGroup heading="Go to">
                <CommandItem
                  onSelect={() =>
                    runCommand(() =>
                      router.push(getBusinessDashboardPath(businessSlug)),
                    )
                  }
                >
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    runCommand(() =>
                      router.push(getBusinessInquiriesPath(businessSlug)),
                    )
                  }
                >
                  <Inbox className="mr-2 h-4 w-4" />
                  <span>Inquiries</span>
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    runCommand(() =>
                      router.push(getBusinessQuotesPath(businessSlug)),
                    )
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Quotes</span>
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    runCommand(() =>
                      router.push(getBusinessFollowUpsPath(businessSlug)),
                    )
                  }
                >
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Follow-ups</span>
                </CommandItem>
                {canOperate ? (
                  <CommandItem
                    onSelect={() =>
                      runCommand(() =>
                        router.push(getBusinessFormsPath(businessSlug)),
                      )
                    }
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>Inquiry forms</span>
                  </CommandItem>
                ) : null}
                {canSeeAnalytics ? (
                  <CommandItem
                    onSelect={() =>
                      runCommand(() =>
                        router.push(getBusinessAnalyticsPath(businessSlug)),
                      )
                    }
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Analytics</span>
                  </CommandItem>
                ) : null}
                {canManageMembers ? (
                  <CommandItem
                    onSelect={() =>
                      runCommand(() =>
                        router.push(getBusinessMembersPath(businessSlug)),
                      )
                    }
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>Team members</span>
                  </CommandItem>
                ) : null}
              </CommandGroup>

              <CommandSeparator />

              {/* Share */}
              <CommandGroup heading="Share">
                <CommandItem onSelect={() => runCommand(copyPublicInquiryLink)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  <span>Copy public inquiry link</span>
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    runCommand(() => {
                      window.open(
                        publicInquiryPath,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    })
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>Open public inquiry page</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {/* Export */}
              <CommandGroup heading="Export">
                <CommandItem
                  onSelect={() =>
                    runCommand(() => {
                      if (!canExport) {
                        showExportNotice();
                        return;
                      }
                      window.location.assign(
                        getBusinessQuotesExportPath(businessSlug),
                      );
                    })
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span>Download quotes (CSV)</span>
                  {!canExport ? <ProBadge /> : null}
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    runCommand(() => {
                      if (!canExport) {
                        showExportNotice();
                        return;
                      }
                      window.location.assign(
                        getBusinessInquiriesExportPath(businessSlug),
                      );
                    })
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span>Download inquiries (CSV)</span>
                  {!canExport ? <ProBadge /> : null}
                </CommandItem>
              </CommandGroup>

              {canOperate ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Settings">
                    <CommandItem
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            getBusinessSettingsPath(businessSlug, "quote"),
                          ),
                        )
                      }
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Quote defaults</span>
                    </CommandItem>
                    <CommandItem
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            getBusinessSettingsPath(businessSlug, "pricing"),
                          ),
                        )
                      }
                    >
                      <Tags className="mr-2 h-4 w-4" />
                      <span>Pricing library</span>
                    </CommandItem>
                    <CommandItem
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            getBusinessSettingsPath(businessSlug, "email"),
                          ),
                        )
                      }
                    >
                      <MessagesSquare className="mr-2 h-4 w-4" />
                      <span>Email template</span>
                    </CommandItem>
                    <CommandItem
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            getBusinessSettingsPath(businessSlug, "knowledge"),
                          ),
                        )
                      }
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Knowledge</span>
                    </CommandItem>
                    <CommandItem
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            getBusinessSettingsPath(
                              businessSlug,
                              "notifications",
                            ),
                          ),
                        )
                      }
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notification settings</span>
                    </CommandItem>
                    {isBusinessOwner ? (
                      <CommandItem
                        onSelect={() =>
                          runCommand(() =>
                            router.push(
                              getBusinessSettingsPath(businessSlug, "billing"),
                            ),
                          )
                        }
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Business billing</span>
                      </CommandItem>
                    ) : null}
                  </CommandGroup>
                </>
              ) : null}

              <CommandSeparator />

              {/* Theme */}
              <CommandGroup heading="Theme">
                <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  <span>System</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {/* Workspace / Account */}
              <CommandGroup heading="Workspace">
                <CommandItem
                  onSelect={() =>
                    runCommand(() => router.push(getBusinessPath(businessSlug)))
                  }
                >
                  <PanelsTopLeft className="mr-2 h-4 w-4" />
                  <span>Business overview</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push(businessesHubPath))}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  <span>All businesses</span>
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    runCommand(() => router.push(getAccountProfilePath()))
                  }
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Account settings</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProBadge() {
  return (
    <span className="ml-auto rounded-md border border-border/70 px-1.5 py-0.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      Pro
    </span>
  );
}
