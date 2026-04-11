"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowUpRight, FileText, FormInput, Settings2 } from "lucide-react";
import {
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";

import { DashboardSidebarStack } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import { cn } from "@/lib/utils";

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
  generalSettingsHref: string;
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

  return (
    <div className="grid min-w-0 items-start gap-3 sm:gap-4 lg:gap-5 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-4">
      <div className="min-w-0 xl:sticky xl:top-[5.5rem] xl:self-start">
        <div className="px-1 pb-1 xl:hidden">
          <div className="flex flex-col gap-2">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Form section
            </p>

            <Combobox
              id="form-editor-section"
              onValueChange={(value) =>
                handleSectionChange(value as BusinessInquiryFormEditorSection)
              }
              options={editorSections.map((section) => ({
                icon: section.icon,
                label: section.label,
                searchText: section.label,
                value: section.id,
              }))}
              placeholder="Choose a form editor section"
              renderOption={(option) => {
                const Icon = option.icon;

                return (
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{option.label}</span>
                  </span>
                );
              }}
              renderValue={(option) => {
                const Icon = option.icon;

                return (
                  <span className="flex min-w-0 items-center gap-2 text-left">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{option.label}</span>
                  </span>
                );
              }}
              searchPlaceholder="Search form section"
              value={activeSection}
            />
          </div>
        </div>

        <aside className="hidden xl:block">
          <nav className="flex flex-col gap-1 pr-3">
            {editorSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-[0.94rem] font-medium tracking-tight transition-[border-color,background-color,color,box-shadow]",
                    isActive
                      ? "border-border/75 bg-accent/35 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "border-transparent text-muted-foreground hover:border-border/55 hover:bg-accent/16 hover:text-foreground",
                  )}
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  type="button"
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md text-current transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>

                  <span className="min-w-0 truncate leading-tight">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      <div className="min-w-0 w-full">
        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
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

        <div className="mt-3 min-w-0 sm:mt-4">
          <div aria-hidden={activeSection !== "fields"} className={activeSection === "fields" ? "block" : "hidden"}>
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
          </div>

          <div aria-hidden={activeSection !== "page"} className={activeSection === "page" ? "block" : "hidden"}>
            <DashboardSidebarStack>
              <BusinessInquiryPageForm
                key={`${settings.updatedAt.getTime()}-${settings.formId}-page`}
                action={updatePageAction}
                generalSettingsHref={generalSettingsHref}
                logoPreviewUrl={logoPreviewUrl}
                onDraftChange={handlePageDraftChange}
                onPreview={handleOpenPreview}
                settings={settings}
              />
            </DashboardSidebarStack>
          </div>

          <div
            aria-hidden={activeSection !== "publishing"}
            className={activeSection === "publishing" ? "block" : "hidden"}
          >
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
          </div>
        </div>
      </div>

      <BusinessInquiryPreviewOverlay
        business={previewSnapshot}
        onOpenChange={setIsPreviewOpen}
        open={isPreviewOpen}
        openFormHref={isPublicLive ? publicInquiryHref : previewHref}
      />
    </div>
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

  return {
    id: settings.id,
    name: settings.name,
    slug: settings.slug,
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
  };
}
