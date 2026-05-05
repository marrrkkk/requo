"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowUpRight,
  FileText,
  FormInput,
  Settings2,
} from "lucide-react";
import {
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";

import { DashboardSidebarStack } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MobileTabsCombobox } from "@/components/shared/mobile-tabs-combobox";
import { createPublicInquiryPreviewBusiness } from "@/features/inquiries/preview-business";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";

import type {
  BusinessInquiryFormEditorView,
  BusinessInquiryFormPreviewDraft,
  BusinessInquiryPagePreviewDraft,
  BusinessInquiryFormActionState,
} from "@/features/settings/types";
import { BusinessInquiryFormDangerZone } from "@/features/settings/components/business-inquiry-form-danger-zone";
import { BusinessInquiryFormForm } from "@/features/settings/components/business-inquiry-form-form";
import { BusinessInquiryFormManageCard } from "@/features/settings/components/business-inquiry-form-manage-card";
import { BusinessInquiryFormPresetCard } from "@/features/settings/components/business-inquiry-form-preset-card";
import { BusinessInquiryPreviewOverlay } from "@/features/settings/components/business-inquiry-preview-overlay";
import { BusinessInquiryPageForm } from "@/features/settings/components/business-inquiry-page-form";

type BusinessInquiryFormEditorTabsProps = {
  settings: BusinessInquiryFormEditorView;
  logoPreviewUrl: string | null;
  generalSettingsHref: string | null;
  settingsHref: string;
  previewHref: string;
  publicInquiryHref: string;
  inquiryListHref: string;
  isPublicLive: boolean;

  applyPresetAction: (
    state: BusinessInquiryFormActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormActionState>;
  saveFormAction: Parameters<typeof BusinessInquiryFormForm>[0]["saveAction"];
  updatePageAction: Parameters<typeof BusinessInquiryPageForm>[0]["action"];

  duplicateAction: Parameters<typeof BusinessInquiryFormManageCard>[0]["duplicateAction"];
  setDefaultAction: Parameters<typeof BusinessInquiryFormManageCard>[0]["setDefaultAction"];
  togglePublicAction: Parameters<typeof BusinessInquiryFormManageCard>[0]["togglePublicAction"];

  archiveAction: Parameters<typeof BusinessInquiryFormDangerZone>[0]["archiveAction"];
  deleteAction: Parameters<typeof BusinessInquiryFormDangerZone>[0]["deleteAction"];
};

type BusinessInquiryFormEditorSection = "fields" | "page" | "publishing";

const editorSections: Array<{
  id: BusinessInquiryFormEditorSection;
  label: string;
  icon: typeof FormInput;
}> = [
  {
    id: "page",
    label: "Page",
    icon: FileText,
  },
  {
    id: "fields",
    label: "Fields",
    icon: FormInput,
  },
  {
    id: "publishing",
    label: "Publishing",
    icon: Settings2,
  },
];

function isEditorSection(value: string | null): value is BusinessInquiryFormEditorSection {
  return value === "fields" || value === "page" || value === "publishing";
}

function getEditorSectionValue(searchParams: ReadonlyURLSearchParams) {
  const section = searchParams.get("section");
  return isEditorSection(section) ? section : "page";
}

export function BusinessInquiryFormEditorTabs({
  settings,
  logoPreviewUrl,
  generalSettingsHref,
  settingsHref,
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
  const searchParams = useSearchParams();
  const activeSectionFromUrl = getEditorSectionValue(searchParams);
  const [activeSectionOverride, setActiveSectionOverride] =
    useState<BusinessInquiryFormEditorSection | null>(null);
  const activeSection = activeSectionOverride ?? activeSectionFromUrl;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formDraft, setFormDraft] = useState(() =>
    createFormPreviewDraft(settings),
  );
  const [pageDraft, setPageDraft] = useState(() =>
    createPagePreviewDraft(settings),
  );
  const previewLogoUrl = useMemo(
    () =>
      settings.logoStoragePath
        ? `/api/public/businesses/${settings.slug}/logo?v=${settings.updatedAt.getTime()}`
        : null,
    [settings.logoStoragePath, settings.slug, settings.updatedAt],
  );
  const previewSnapshot = useMemo(
    () =>
      createPreviewSnapshot({
        formDraft,
        pageDraft,
        previewLogoUrl,
        settings,
      }),
    [formDraft, pageDraft, previewLogoUrl, settings],
  );

  const handleFormDraftChange = useCallback(
    (nextDraft: BusinessInquiryFormPreviewDraft) => {
      setFormDraft(nextDraft);
    },
    [],
  );
  const handlePageDraftChange = useCallback(
    (nextDraft: BusinessInquiryPagePreviewDraft) => {
      setPageDraft(nextDraft);
    },
    [],
  );

  const handleOpenPreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  function handleSectionChange(nextSection: BusinessInquiryFormEditorSection) {
    if (nextSection === activeSection) {
      return;
    }

    setActiveSectionOverride(nextSection);
  }

  function handleTabChange(nextSection: string) {
    if (isEditorSection(nextSection)) {
      handleSectionChange(nextSection);
    }
  }

  return (
    <Tabs
      className="flex flex-col gap-4"
      onValueChange={handleTabChange}
      value={activeSection}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Mobile: combobox dropdown */}
        <MobileTabsCombobox
          groups={[{ items: editorSections.map(s => ({ label: s.label, value: s.id, icon: s.icon })) }]}
          activeValue={activeSection}
          onValueChange={(val) => handleSectionChange(val as BusinessInquiryFormEditorSection)}
        />

        {/* Desktop: horizontal tabs */}
        <TabsList className="hidden sm:inline-flex">
          {editorSections.map((section) => {
            const Icon = section.icon;

            return (
              <TabsTrigger
                data-tour={
                  section.id === "fields"
                    ? "form-builder"
                    : section.id === "page"
                      ? "public-page"
                      : "form-settings"
                }
                key={section.id}
                value={section.id}
              >
                <Icon className="size-4" />
                {section.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <Button asChild className="w-full sm:w-auto" type="button">
          <Link
            href={isPublicLive ? publicInquiryHref : previewHref}
            prefetch={false}
            rel="noreferrer"
            target="_blank"
          >
            Open form
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <div className="min-w-0">
        <TabsContent
          className={activeSection === "fields" ? undefined : "hidden"}
          forceMount
          value="fields"
        >
          <DashboardSidebarStack>
            <BusinessInquiryFormForm
              key={`${settings.updatedAt.getTime()}-${settings.formId}-form`}
              draft={formDraft}
              isActive={activeSection === "fields"}
              onDraftChange={handleFormDraftChange}
              onPreview={handleOpenPreview}
              saveAction={saveFormAction}
              settings={settings}
            />
          </DashboardSidebarStack>
        </TabsContent>

        <TabsContent
          className={activeSection === "page" ? undefined : "hidden"}
          forceMount
          value="page"
        >
          <DashboardSidebarStack>
            <BusinessInquiryPageForm
              key={`${settings.updatedAt.getTime()}-${settings.formId}-page`}
              action={updatePageAction}
              generalSettingsHref={generalSettingsHref}
              logoPreviewUrl={logoPreviewUrl}
              onDraftChange={handlePageDraftChange}
              onPreview={handleOpenPreview}
              settingsHref={settingsHref}
              settings={settings}
            />
          </DashboardSidebarStack>
        </TabsContent>

        <TabsContent
          className={activeSection === "publishing" ? undefined : "hidden"}
          forceMount
          value="publishing"
        >
          <section className="flex flex-col gap-6 sm:gap-8">
            <div className="flex flex-col gap-2.5 sm:px-2">
              <h2 className="font-heading text-[1.65rem] font-semibold tracking-tight text-foreground">
                Publishing
              </h2>
              <p className="text-base leading-6 text-muted-foreground">
                Manage presets, defaults, and the live status of your form.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
              <div className="min-w-0">
                <div className="grid gap-4">
                  <BusinessInquiryFormManageCard
                    duplicateAction={duplicateAction}
                    formId={settings.formId}
                    isDefault={settings.isDefault}
                    isPublicInquiryEnabled={settings.publicInquiryEnabled}
                    setDefaultAction={setDefaultAction}
                    togglePublicAction={togglePublicAction}
                  />
                  <BusinessInquiryFormPresetCard
                    action={applyPresetAction}
                    businessType={pageDraft.businessType}
                    formId={settings.formId}
                  />
                </div>
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
          </section>
        </TabsContent>
      </div>

      <BusinessInquiryPreviewOverlay
        business={previewSnapshot}
        onOpenChange={setIsPreviewOpen}
        open={isPreviewOpen}
        openFormHref={isPublicLive ? publicInquiryHref : previewHref}
      />
    </Tabs>
  );
}

function createFormPreviewDraft(
  settings: BusinessInquiryFormEditorView,
): BusinessInquiryFormPreviewDraft {
  return {
    businessType: settings.businessType,
    formName: settings.formName,
    formSlug: settings.formSlug,
    inquiryFormConfig: settings.inquiryFormConfig,
    inquiryPageConfig: settings.inquiryPageConfig,
  };
}

function createPagePreviewDraft(
  settings: BusinessInquiryFormEditorView,
): BusinessInquiryPagePreviewDraft {
  return {
    businessType: settings.businessType,
    formName: settings.formName,
    formSlug: settings.formSlug,
    publicInquiryEnabled: settings.publicInquiryEnabled,
    inquiryPageConfig: settings.inquiryPageConfig,
  };
}

function createPreviewSnapshot({
  formDraft,
  pageDraft,
  previewLogoUrl,
  settings,
}: {
  formDraft: BusinessInquiryFormPreviewDraft;
  pageDraft: BusinessInquiryPagePreviewDraft;
  previewLogoUrl: string | null;
  settings: BusinessInquiryFormEditorView;
}): PublicInquiryBusiness {
  const previewInquiryPageConfig = pageDraft.inquiryPageConfig;
  const previewInquiryFormConfig = {
    ...formDraft.inquiryFormConfig,
    businessType: pageDraft.businessType,
  };

  return createPublicInquiryPreviewBusiness({
    id: settings.id,
    name: settings.name,
    slug: settings.slug,
    plan: settings.plan,
    businessType: pageDraft.businessType,
    shortDescription: settings.shortDescription,
    logoUrl: previewLogoUrl,
    form: {
      id: settings.formId,
      name: pageDraft.formName,
      slug: pageDraft.formSlug,
      businessType: pageDraft.businessType,
      isDefault: settings.isDefault,
      publicInquiryEnabled: pageDraft.publicInquiryEnabled,
    },
    inquiryFormConfig: previewInquiryFormConfig,
    inquiryPageConfig: previewInquiryPageConfig,
  });
}



