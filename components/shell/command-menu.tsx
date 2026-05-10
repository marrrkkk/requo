"use client";



import * as React from "react";

import {

  BarChart3,

  Bell,

  BookOpen,

  BriefcaseBusiness,

  CreditCard,

  Download,

  ExternalLink,

  FileText,

  Link2,

  LogOut,

  PanelsTopLeft,

  Plug,

  Plus,

  Search,

  User,

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

  getBusinessInquiriesExportPath,

  getBusinessNewInquiryPath,

  getBusinessQuotesExportPath,

  getBusinessQuotesPath,

  getBusinessPath,

  getBusinessSettingsPath,

  businessesHubPath,

} from "@/features/businesses/routes";

import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";

import { clearPersistedThemePreference } from "@/features/theme/persistence";

import { themeUserStorageKey } from "@/features/theme/types";

import { authClient } from "@/lib/auth/client";

import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

import {

  canManageBusinessAdministration,

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



  const canOperate = canManageOperationalBusinessSettings(role);

  const canSeeAnalytics = canViewBusinessAnalytics(role);

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

          className="p-0 sm:max-w-[550px]"

          showCloseButton={false}

          onOpenAutoFocus={(e) => e.preventDefault()}

        >

          <DialogTitle className="sr-only">Quick actions</DialogTitle>

          <DialogDescription className="sr-only">

            Create records, export data, copy links, and open business tools.

          </DialogDescription>

          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">

            <CommandInput placeholder="Search actions…" />

            <CommandList>

              <CommandEmpty>No matching actions.</CommandEmpty>



              <CommandGroup heading="Create">

                <CommandItem

                  onSelect={() =>

                    runCommand(() => router.push(getBusinessNewInquiryPath(businessSlug)))

                  }

                >

                  <Plus className="mr-2 h-4 w-4" />

                  <span>New inquiry</span>

                </CommandItem>

                <CommandItem

                  onSelect={() =>

                    runCommand(() => router.push(`${getBusinessQuotesPath(businessSlug)}/new`))

                  }

                >

                  <Plus className="mr-2 h-4 w-4" />

                  <span>New quote</span>

                </CommandItem>

              </CommandGroup>



              <CommandSeparator />



              <CommandGroup heading="Export">

                <CommandItem

                  onSelect={() =>

                    runCommand(() => {

                      if (!canExport) {

                        showExportNotice();

                        return;

                      }



                      window.location.assign(getBusinessQuotesExportPath(businessSlug));

                    })

                  }

                >

                  <Download className="mr-2 h-4 w-4" />

                  <span>Download quotes (CSV)</span>

                  {!canExport ? (

                    <span className="ml-auto rounded-md border border-border/70 px-1.5 py-0.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">

                      Pro

                    </span>

                  ) : null}

                </CommandItem>

                <CommandItem

                  onSelect={() =>

                    runCommand(() => {

                      if (!canExport) {

                        showExportNotice();

                        return;

                      }



                      window.location.assign(getBusinessInquiriesExportPath(businessSlug));

                    })

                  }

                >

                  <Download className="mr-2 h-4 w-4" />

                  <span>Download inquiries (CSV)</span>

                  {!canExport ? (

                    <span className="ml-auto rounded-md border border-border/70 px-1.5 py-0.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">

                      Pro

                    </span>

                  ) : null}

                </CommandItem>

              </CommandGroup>



              <CommandSeparator />



              <CommandGroup heading="Share">

                <CommandItem

                  onSelect={() =>

                    runCommand(() => {

                      copyPublicInquiryLink();

                    })

                  }

                >

                  <Link2 className="mr-2 h-4 w-4" />

                  <span>Copy public inquiry link</span>

                </CommandItem>

                <CommandItem

                  onSelect={() =>

                    runCommand(() => {

                      window.open(publicInquiryPath, "_blank", "noopener,noreferrer");

                    })

                  }

                >

                  <ExternalLink className="mr-2 h-4 w-4" />

                  <span>Open public inquiry page</span>

                </CommandItem>

              </CommandGroup>



              {canSeeAnalytics ? (

                <>

                  <CommandSeparator />

                  <CommandGroup heading="Insights">

                    <CommandItem

                      onSelect={() =>

                        runCommand(() => router.push(getBusinessAnalyticsPath(businessSlug)))

                      }

                    >

                      <BarChart3 className="mr-2 h-4 w-4" />

                      <span>View analytics</span>

                    </CommandItem>

                  </CommandGroup>

                </>

              ) : null}



              <CommandSeparator />



              <CommandGroup heading="Business">

                <CommandItem

                  onSelect={() =>

                    runCommand(() => router.push(getBusinessPath(businessSlug)))

                  }

                >

                  <BriefcaseBusiness className="mr-2 h-4 w-4" />

                  <span>Open business</span>

                </CommandItem>

                {isBusinessOwner ? (

                  <CommandItem

                    onSelect={() =>

                      runCommand(() =>

                        router.push(getBusinessSettingsPath(businessSlug)),

                      )

                    }

                  >

                    <BriefcaseBusiness className="mr-2 h-4 w-4" />

                    <span>Business settings & billing</span>

                  </CommandItem>

                ) : null}

                <CommandItem

                  onSelect={() => runCommand(() => router.push(businessesHubPath))}

                >

                  <PanelsTopLeft className="mr-2 h-4 w-4" />

                  <span>All businesses</span>

                </CommandItem>

              </CommandGroup>



              {canOperate ? (

                <>

                  <CommandSeparator />

                  <CommandGroup heading="Business setup">

                    <CommandItem

                      onSelect={() =>

                        runCommand(() =>

                          router.push(getBusinessSettingsPath(businessSlug, "quote")),

                        )

                      }

                    >

                      <FileText className="mr-2 h-4 w-4" />

                      <span>Quote defaults</span>

                    </CommandItem>

                    <CommandItem

                      onSelect={() =>

                        runCommand(() =>

                          router.push(getBusinessSettingsPath(businessSlug, "knowledge")),

                        )

                      }

                    >

                      <BookOpen className="mr-2 h-4 w-4" />

                      <span>Knowledge</span>

                    </CommandItem>

                    <CommandItem

                      onSelect={() =>

                        runCommand(() =>

                          router.push(getBusinessSettingsPath(businessSlug, "notifications")),

                        )

                      }

                    >

                      <Bell className="mr-2 h-4 w-4" />

                      <span>Notification settings</span>

                    </CommandItem>

                    <CommandItem

                      onSelect={() =>

                        runCommand(() =>

                          router.push(getBusinessSettingsPath(businessSlug, "billing")),

                        )

                      }

                    >

                      <CreditCard className="mr-2 h-4 w-4" />

                      <span>Business billing</span>

                    </CommandItem>

                    <CommandItem

                      onSelect={() =>

                        runCommand(() =>

                          router.push(getBusinessSettingsPath(businessSlug, "integrations")),

                        )

                      }

                    >

                      <Plug className="mr-2 h-4 w-4" />

                      <span>Integrations</span>

                    </CommandItem>

                  </CommandGroup>

                </>

              ) : null}



              <CommandSeparator />



              <CommandGroup heading="Account">

                <CommandItem

                  onSelect={() =>

                    runCommand(() => router.push(getAccountProfilePath()))

                  }

                >

                  <User className="mr-2 h-4 w-4" />

                  <span>User settings</span>

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


