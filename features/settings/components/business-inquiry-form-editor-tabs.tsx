"use client";

import { ArrowUpRight, Eye, FileText, FormInput, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { BusinessInquiryFormEditorView } from "@/features/settings/types";
import { BusinessInquiryFormDangerZone } from "@/features/settings/components/business-inquiry-form-danger-zone";
import { BusinessInquiryFormForm } from "@/features/settings/components/business-inquiry-form-form";
import { BusinessInquiryFormManageCard } from "@/features/settings/components/business-inquiry-form-manage-card";
import { BusinessInquiryPageForm } from "@/features/settings/components/business-inquiry-page-form";

type BusinessInquiryFormEditorTabsProps = {
  settings: BusinessInquiryFormEditorView;
  logoPreviewUrl: string | null;
  generalSettingsHref: string;
  previewHref: string;
  publicInquiryHref: string;
  inquiryListHref: string;
  isPublicLive: boolean;

  applyPresetAction: Parameters<typeof BusinessInquiryFormForm>[0]["applyPresetAction"];
  saveFormAction: Parameters<typeof BusinessInquiryFormForm>[0]["saveAction"];
  updatePageAction: Parameters<typeof BusinessInquiryPageForm>[0]["action"];

  duplicateAction: Parameters<typeof BusinessInquiryFormManageCard>[0]["duplicateAction"];
  setDefaultAction: Parameters<typeof BusinessInquiryFormManageCard>[0]["setDefaultAction"];
  togglePublicAction: Parameters<typeof BusinessInquiryFormManageCard>[0]["togglePublicAction"];

  archiveAction: Parameters<typeof BusinessInquiryFormDangerZone>[0]["archiveAction"];
  deleteAction: Parameters<typeof BusinessInquiryFormDangerZone>[0]["deleteAction"];
};

export function BusinessInquiryFormEditorTabs({
  settings,
  logoPreviewUrl,
  generalSettingsHref,
  previewHref,
  publicInquiryHref,
  inquiryListHref,
  isPublicLive,
  applyPresetAction,
  saveFormAction,
  updatePageAction,
  duplicateAction,
  setDefaultAction,
  togglePublicAction,
  archiveAction,
  deleteAction,
}: BusinessInquiryFormEditorTabsProps) {
  const [tab, setTab] = useState<"fields" | "page" | "publishing">(
    "fields",
  );

  function openInBrowserTab(href: string) {
    const nextTab = window.open("about:blank", "_blank");

    if (!nextTab) {
      window.location.href = href;
      return;
    }

    nextTab.opener = null;
    nextTab.location.href = href;
  }

  const tabsList = useMemo(
    () => (
      <TabsList className="w-full justify-start sm:w-fit">
        <TabsTrigger value="fields">
          <FormInput data-icon="inline-start" />
          Fields
        </TabsTrigger>
        <TabsTrigger value="page">
          <FileText data-icon="inline-start" />
          Page
        </TabsTrigger>
        <TabsTrigger value="publishing">
          <Settings2 data-icon="inline-start" />
          Publishing
        </TabsTrigger>
      </TabsList>
    ),
    [],
  );

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        {tabsList}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => openInBrowserTab(previewHref)}
            type="button"
            variant="outline"
          >
            <Eye data-icon="inline-start" />
            Preview
          </Button>
          <Button
            onClick={() => openInBrowserTab(isPublicLive ? publicInquiryHref : previewHref)}
            type="button"
          >
            Open form
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </div>
      </div>

      <TabsContent value="fields" className="mt-2 pt-2">
        <DashboardSidebarStack>
          <BusinessInquiryFormForm
            key={`${settings.updatedAt.getTime()}-${settings.formId}-form`}
            applyPresetAction={applyPresetAction}
            saveAction={saveFormAction}
            settings={settings}
          />
        </DashboardSidebarStack>
      </TabsContent>

      <TabsContent value="page" className="mt-2 pt-2">
        <DashboardSidebarStack>
          <BusinessInquiryPageForm
            action={updatePageAction}
            settings={settings}
            logoPreviewUrl={logoPreviewUrl}
            generalSettingsHref={generalSettingsHref}
          />
        </DashboardSidebarStack>
      </TabsContent>

      <TabsContent value="publishing" className="mt-2 pt-2">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
          <div className="min-w-0">
            <BusinessInquiryFormManageCard
              duplicateAction={duplicateAction}
              formId={settings.formId}
              isDefault={settings.isDefault}
              isPublicInquiryEnabled={settings.publicInquiryEnabled}
              setDefaultAction={setDefaultAction}
              togglePublicAction={togglePublicAction}
            />
          </div>
          <div className="min-w-0">
            <BusinessInquiryFormDangerZone
              activeFormCount={settings.activeFormCount}
              archiveAction={archiveAction}
              deleteAction={deleteAction}
              formId={settings.formId}
              inquiryListHref={inquiryListHref}
              isDefault={settings.isDefault}
              submittedInquiryCount={settings.submittedInquiryCount}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
