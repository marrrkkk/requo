import { TriangleAlert } from "lucide-react";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { DataListPagination } from "@/components/shared/data-list-pagination";
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { AdminListContentFallback } from "@/features/admin/components/list/admin-list-content-fallback";
import { AdminListControlsFallback } from "@/features/admin/components/list/admin-list-controls-fallback";
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/features/admin/components/primitives/admin-data-table";
import {
  AdminListToolbar,
  type AdminToolbarField,
} from "@/features/admin/components/primitives/admin-list-toolbar";
import { getAdminToolbarParam } from "@/features/admin/components/primitives/admin-toolbar-params";
import {
  ADMIN_AI_PROVIDERS,
  ADMIN_AI_PROVIDER_LABELS,
} from "@/features/admin/constants";
import { ADMIN_AI_ERRORS_PATH } from "@/features/admin/navigation";
import { listAdminAiErrors } from "@/features/admin/queries";
import { adminAiErrorsFiltersSchema } from "@/features/admin/schemas";
import type {
  AdminAiErrorRow,
  AdminAiSecurityEvent,
} from "@/features/admin/types";
import { formatAiDateTime } from "@/features/admin/components/ai/admin-ai-format";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminAiErrorsSectionsProps = {
  rawParams: SearchParamsRecord;
};

const aiErrorToolbarFields: AdminToolbarField[] = [
  {
    kind: "select",
    key: "provider",
    label: "Provider",
    allLabel: "All providers",
    options: ADMIN_AI_PROVIDERS.map((provider) => ({
      value: provider,
      label: ADMIN_AI_PROVIDER_LABELS[provider],
    })),
  },
  {
    kind: "text",
    key: "model",
    label: "Model",
    placeholder: "Filter by model name",
  },
  {
    kind: "text",
    key: "taskType",
    label: "Task type",
    placeholder: "e.g. quote_draft",
  },
];

const aiErrorToolbarKeys = aiErrorToolbarFields.map((field) => field.key);

function toolbarValues(rawParams: SearchParamsRecord): Record<string, string> {
  return Object.fromEntries(
    aiErrorToolbarKeys.map((key) => [key, getAdminToolbarParam(rawParams, key)]),
  );
}

export async function AdminAiErrorsControlsSection({
  rawParams,
}: AdminAiErrorsSectionsProps) {
  const filters = adminAiErrorsFiltersSchema.safeParse(rawParams).data ?? {
    page: 1,
    pageSize: 25,
  };
  const { total } = await listAdminAiErrors(filters);

  return (
    <AdminListToolbar
      description="Only persisted failures are listed: failed calls plus security events. Rate-limit, exhaustion, and fallback events are console logs — never stored — so they cannot appear here."
      fields={aiErrorToolbarFields}
      resultLabel={`${total.toLocaleString("en-US")} ${total === 1 ? "error" : "errors"}`}
      values={toolbarValues(rawParams)}
    />
  );
}

const aiErrorColumns: AdminDataTableColumn<AdminAiErrorRow>[] = [
  {
    id: "created",
    header: "Time",
    width: "w-[11rem]",
    cell: (row) => (
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        {formatAiDateTime(row.createdAt)}
      </span>
    ),
  },
  {
    id: "provider",
    header: "Provider",
    width: "w-[8rem]",
    cell: (row) => (
      <span className="text-sm font-medium text-foreground">{row.provider}</span>
    ),
  },
  {
    id: "model",
    header: "Model",
    width: "w-[14rem]",
    cell: (row) => (
      <TruncatedTextWithTooltip
        className="font-mono text-xs text-foreground"
        text={row.model}
      />
    ),
  },
  {
    id: "task",
    header: "Task",
    width: "w-[9rem]",
    cell: (row) => (
      <TruncatedTextWithTooltip
        className="font-mono text-xs text-muted-foreground"
        text={row.taskType}
      />
    ),
  },
  {
    id: "error",
    header: "Error",
    cell: (row) => (
      <TruncatedTextWithTooltip
        className="text-sm text-muted-foreground"
        lines={2}
        text={row.errorMessage || "No error message recorded."}
      />
    ),
  },
];

export async function AdminAiErrorsContentSection({
  rawParams,
}: AdminAiErrorsSectionsProps) {
  const filters =
    adminAiErrorsFiltersSchema.safeParse(rawParams).data ?? {
      page: 1,
      pageSize: 25,
    };

  const { items, total, securityEvents } = await listAdminAiErrors(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);
  const hasActiveFilters = aiErrorToolbarKeys.some(
    (key) => getAdminToolbarParam(rawParams, key).trim() !== "",
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminDataTable
        columns={aiErrorColumns}
        empty={{
          title: hasActiveFilters
            ? "No errors match these filters."
            : "No failed calls",
          description: hasActiveFilters
            ? "Try widening the provider, model, or task filters."
            : "Failed AI calls from the last 90 days will appear here.",
          icon: TriangleAlert,
        }}
        getRowId={(row) => row.id}
        minWidthClass="min-w-[64rem]"
        pagination={
          <DataListPagination
            currentPage={currentPage}
            pageSize={filters.pageSize}
            pathname={ADMIN_AI_ERRORS_PATH}
            searchParams={rawParams}
            totalItems={total}
            totalPages={totalPages}
          />
        }
        rows={items}
      />

      <AdminSecurityEventsSection events={securityEvents} />
    </div>
  );
}

function AdminSecurityEventsSection({
  events,
}: {
  events: AdminAiSecurityEvent[];
}) {
  return (
    <DashboardSection
      description="Newest input-safety and output-filtering events. No prompts or responses are stored — only the event type and matched pattern."
      title={`Security events (${events.length})`}
    >
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No security events on record.
        </p>
      ) : (
        <DashboardDetailFeed>
          {events.map((event) => (
            <DashboardDetailFeedItem
              key={event.id}
              meta={
                <>
                  {event.patternMatched ? (
                    <>
                      <span className="font-mono text-xs">
                        {event.patternMatched}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  ) : null}
                  <span>{formatAiDateTime(event.createdAt)}</span>
                </>
              }
              title={event.eventType.replaceAll("_", " ")}
            />
          ))}
        </DashboardDetailFeed>
      )}
    </DashboardSection>
  );
}

export { AdminListControlsFallback, AdminListContentFallback };
