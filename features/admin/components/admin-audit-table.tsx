"use client";

import { ListFilter, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  DashboardActionsRow,
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { DataListPagination } from "@/components/shared/data-list-pagination";
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProgressRouter } from "@/hooks/use-progress-router";
import {
  ADMIN_ACTIONS,
  ADMIN_DASHBOARD_TARGET_ID,
  ADMIN_TARGET_TYPES,
  type AdminAction,
  type AdminTargetType,
} from "@/features/admin/constants";
import type { AdminAuditLogRow } from "@/features/admin/types";
import { ADMIN_AUDIT_LOGS_PATH } from "@/features/admin/navigation";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminAuditTableFiltersView = {
  readonly adminUserId: string;
  readonly action: AdminAction | "all";
  readonly targetType: AdminTargetType | "all";
  readonly targetId: string;
};

type AdminAuditTableProps = {
  items: AdminAuditLogRow[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  filters: AdminAuditTableFiltersView;
  searchParams: SearchParamsRecord;
};

const allActionOption = { value: "all", label: "All actions" } as const;
const allTargetTypeOption = {
  value: "all",
  label: "All targets",
} as const;

const actionLabels: Record<AdminAction, string> = {
  "view.dashboard": "Viewed dashboard",
  "view.users": "Viewed users",
  "view.user": "Viewed user",
  "view.businesses": "Viewed businesses",
  "view.business": "Viewed business",
  "view.subscriptions": "Viewed subscriptions",
  "view.subscription": "Viewed subscription",
  "view.audit-logs": "Viewed audit logs",
  "view.system": "Viewed system",
  "user.force_verify_email": "Force-verified email",
  "user.revoke_all_sessions": "Revoked all sessions",
  "user.suspend": "Suspended user",
  "user.unsuspend": "Unsuspended user",
  "user.delete": "Deleted user",
  "user.promote_admin": "Promoted to admin",
  "user.demote_admin": "Removed admin access",
  "admin.bootstrap": "Admin bootstrap",
  "subscription.manual_plan_override": "Manual plan override",
  "subscription.force_cancel": "Force-canceled subscription",
  "impersonation.start": "Started impersonation",
  "impersonation.stop": "Stopped impersonation",
  "confirmation.failed": "Password confirmation failed",
};

const targetTypeLabels: Record<AdminTargetType, string> = {
  user: "User",
  business: "Business",
  subscription: "Subscription",
  "audit-log": "Audit log",
  dashboard: "Dashboard",
};

const viewActionPrefixes = ["view."] as const;
const destructiveActionPrefixes = ["user.", "subscription.", "impersonation."];
const failureActions = new Set<AdminAction>(["confirmation.failed"]);

function getActionBadgeVariant(
  action: AdminAction,
): "default" | "secondary" | "destructive" | "outline" {
  if (failureActions.has(action)) {
    return "destructive";
  }

  if (viewActionPrefixes.some((prefix) => action.startsWith(prefix))) {
    return "secondary";
  }

  if (destructiveActionPrefixes.some((prefix) => action.startsWith(prefix))) {
    return "outline";
  }

  return "default";
}

function formatActionLabel(action: AdminAction): string {
  return actionLabels[action] ?? action;
}

function formatTargetTypeLabel(targetType: AdminTargetType): string {
  return targetTypeLabels[targetType] ?? targetType;
}

function formatAbsoluteTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatIsoTimestamp(date: Date): string {
  return date.toISOString();
}

function formatMetadataExcerpt(
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) {
    return null;
  }

  const keys = Object.keys(metadata);

  if (keys.length === 0) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

function formatMetadataPretty(
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) {
    return null;
  }

  try {
    const pretty = JSON.stringify(metadata, null, 2);
    return pretty && pretty !== "{}" ? pretty : null;
  } catch {
    return null;
  }
}

function formatTargetIdForDisplay(targetId: string): string {
  if (targetId === ADMIN_DASHBOARD_TARGET_ID) {
    return "—";
  }

  return targetId;
}

const actionOptions = [
  allActionOption,
  ...ADMIN_ACTIONS.map((action) => ({
    value: action,
    label: formatActionLabel(action),
  })),
];

const targetTypeOptions = [
  allTargetTypeOption,
  ...ADMIN_TARGET_TYPES.map((targetType) => ({
    value: targetType,
    label: formatTargetTypeLabel(targetType),
  })),
];

type ResolvedFilterState = {
  adminUserId: string;
  action: AdminAction | "all";
  targetType: AdminTargetType | "all";
  targetId: string;
};

function filtersDirty(filters: ResolvedFilterState): boolean {
  return Boolean(
    filters.adminUserId.trim() ||
      filters.action !== "all" ||
      filters.targetType !== "all" ||
      filters.targetId.trim(),
  );
}

/**
 * Paginated admin audit log table.
 *
 * Renders the audit list with four URL-backed filters (admin user id,
 * action, target type, target id) plus pagination. The filter state is
 * reflected into the URL via `useProgressRouter().replace` so deep
 * links, refreshes, and `Suspense` streaming all stay in sync without
 * re-fetching on every keystroke.
 *
 * Ordering is `createdAt` DESC — enforced by `listAdminAuditLogs` on
 * the server per Requirement 10.6 — so the table simply renders the
 * items it receives without re-sorting client-side.
 */
export function AdminAuditTable({
  items,
  totalItems,
  currentPage,
  pageSize,
  totalPages,
  filters,
  searchParams,
}: AdminAuditTableProps) {
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();

  const [adminUserId, setAdminUserId] = useState(filters.adminUserId);
  const [action, setAction] = useState<AdminAction | "all">(filters.action);
  const [targetType, setTargetType] = useState<AdminTargetType | "all">(
    filters.targetType,
  );
  const [targetId, setTargetId] = useState(filters.targetId);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef("");

  const navigate = useCallback(
    (next: ResolvedFilterState) => {
      const params = new URLSearchParams();

      const trimmedAdminUserId = next.adminUserId.trim();
      const trimmedTargetId = next.targetId.trim();

      if (trimmedAdminUserId) {
        params.set("adminUserId", trimmedAdminUserId);
      }

      if (next.action !== "all") {
        params.set("action", next.action);
      }

      if (next.targetType !== "all") {
        params.set("targetType", next.targetType);
      }

      if (trimmedTargetId) {
        params.set("targetId", trimmedTargetId);
      }

      const href = params.size
        ? `${ADMIN_AUDIT_LOGS_PATH}?${params.toString()}`
        : ADMIN_AUDIT_LOGS_PATH;
      const currentHref = currentSearchParams.size
        ? `${pathname}?${currentSearchParams.toString()}`
        : pathname;

      if (href === currentHref || href === lastAppliedHrefRef.current) {
        return;
      }

      lastAppliedHrefRef.current = href;

      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [currentSearchParams, pathname, router],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      navigate({ adminUserId, action, targetType, targetId });
    }, 400);

    return () => clearTimeout(timer);
  }, [adminUserId, action, navigate, targetId, targetType]);

  const resultLabel = useMemo(() => {
    const noun = totalItems === 1 ? "entry" : "entries";
    return `${totalItems} ${noun}`;
  }, [totalItems]);

  const canClear = filtersDirty({ adminUserId, action, targetType, targetId });

  const adminUserControl = (
    <Input
      id="admin-audit-admin-user"
      value={adminUserId}
      onChange={(event) => setAdminUserId(event.currentTarget.value)}
      placeholder="Filter by admin user id"
      aria-label="Admin user id"
      aria-busy={isPending}
      autoComplete="off"
      spellCheck={false}
    />
  );

  const actionControl = (
    <Combobox
      id="admin-audit-action"
      value={action}
      onValueChange={(value) => {
        const nextAction = value as AdminAction | "all";
        setAction(nextAction);
        navigate({
          adminUserId,
          action: nextAction,
          targetType,
          targetId,
        });
      }}
      options={actionOptions}
      placeholder="Action"
      searchable
      searchPlaceholder="Search actions"
    />
  );

  const targetTypeControl = (
    <Combobox
      id="admin-audit-target-type"
      value={targetType}
      onValueChange={(value) => {
        const nextTargetType = value as AdminTargetType | "all";
        setTargetType(nextTargetType);
        navigate({
          adminUserId,
          action,
          targetType: nextTargetType,
          targetId,
        });
      }}
      options={targetTypeOptions}
      placeholder="Target type"
    />
  );

  const targetIdControl = (
    <Input
      id="admin-audit-target-id"
      value={targetId}
      onChange={(event) => setTargetId(event.currentTarget.value)}
      placeholder="Filter by target id"
      aria-label="Target id"
      aria-busy={isPending}
      autoComplete="off"
      spellCheck={false}
    />
  );

  // Mobile sheet keeps visible labels where no placeholder can carry the hint.
  const filterFields = (
    <>
      <Field className="min-w-0 w-full">
        <FieldLabel htmlFor="admin-audit-admin-user">
          Admin user id
        </FieldLabel>
        <FieldContent>{adminUserControl}</FieldContent>
      </Field>

      <Field className="min-w-0 w-full">
        <FieldLabel htmlFor="admin-audit-action">
          Action
        </FieldLabel>
        <FieldContent>{actionControl}</FieldContent>
      </Field>

      <Field className="min-w-0 w-full">
        <FieldLabel htmlFor="admin-audit-target-type">
          Target type
        </FieldLabel>
        <FieldContent>{targetTypeControl}</FieldContent>
      </Field>

      <Field className="min-w-0 w-full">
        <FieldLabel htmlFor="admin-audit-target-id">
          Target id
        </FieldLabel>
        <FieldContent>{targetIdControl}</FieldContent>
      </Field>
    </>
  );

  const desktopFilterFields = (
    <>
      <Field className="min-w-0 flex-1">
        <FieldLabel className="sr-only" htmlFor="admin-audit-admin-user">
          Admin user id
        </FieldLabel>
        <FieldContent>{adminUserControl}</FieldContent>
      </Field>

      <Field className="min-w-0 flex-1 sm:max-w-44">
        <FieldLabel className="sr-only" htmlFor="admin-audit-action">
          Action
        </FieldLabel>
        <FieldContent>{actionControl}</FieldContent>
      </Field>

      <Field className="min-w-0 flex-1 sm:max-w-44">
        <FieldLabel className="sr-only" htmlFor="admin-audit-target-type">
          Target type
        </FieldLabel>
        <FieldContent>{targetTypeControl}</FieldContent>
      </Field>

      <Field className="min-w-0 flex-1">
        <FieldLabel className="sr-only" htmlFor="admin-audit-target-id">
          Target id
        </FieldLabel>
        <FieldContent>{targetIdControl}</FieldContent>
      </Field>
    </>
  );

  const clearFilters = () => {
    setAdminUserId("");
    setAction("all");
    setTargetType("all");
    setTargetId("");
    navigate({
      adminUserId: "",
      action: "all",
      targetType: "all",
      targetId: "",
    });
  };

  return (
    <div className="dashboard-table-shell" data-list-card>
      <div className="data-list-toolbar-strip">
        <div className="data-list-toolbar-grid">
          <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
            {desktopFilterFields}
          </div>

          <DashboardActionsRow className="data-list-toolbar-actions">
            <Sheet
              open={isMobileFiltersOpen}
              onOpenChange={setIsMobileFiltersOpen}
            >
              <SheetTrigger asChild>
                <Button
                  aria-label="Filter audit entries"
                  className="size-9 shrink-0 px-0 sm:hidden"
                  type="button"
                  variant="outline"
                >
                  <ListFilter className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Audit filters</SheetTitle>
                  <SheetDescription>
                    Narrow the audit feed by admin, action, target type, or
                    target id.
                  </SheetDescription>
                </SheetHeader>
                <SheetBody className="gap-4">{filterFields}</SheetBody>
              </SheetContent>
            </Sheet>
            <Button
              className="shrink-0"
              size="sm"
              disabled={!canClear}
              onClick={clearFilters}
              type="button"
              variant="ghost"
            >
              <X data-icon="inline-start" />
              Clear
            </Button>
            {isPending ? (
              <Spinner
                className="inline-flex"
                aria-hidden="true"
              />
            ) : null}
          </DashboardActionsRow>
        </div>

        <p className="data-list-toolbar-count">{resultLabel}</p>
      </div>

      {items.length === 0 ? (
        <div className="p-4">
          <DashboardEmptyState
            description={
              canClear
                ? "No audit entries match the current filters. Try clearing one to broaden the view."
                : "Audit entries will appear here as admins view pages or run actions."
            }
            title="No audit entries"
            variant="list"
          />
        </div>
      ) : (
        <TooltipProvider delayDuration={300}>
          <div className="overflow-x-auto no-scrollbar">
            <Table className="min-w-[72rem] table-fixed">
              <TableCaption className="sr-only">
                Newest audit entries appear first.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[12rem]">When</TableHead>
                  <TableHead className="w-[14rem]">Admin</TableHead>
                  <TableHead className="w-[14rem]">Action</TableHead>
                  <TableHead className="w-[16rem]">Target</TableHead>
                  <TableHead className="w-[14rem]">Metadata</TableHead>
                  <TableHead className="w-[12rem]">Request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((entry) => (
                  <AdminAuditTableRow key={entry.id} entry={entry} />
                ))}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      )}

      <DataListPagination
        currentPage={currentPage}
        pageSize={pageSize}
        pathname={pathname}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
}

function AdminAuditTableRow({ entry }: { entry: AdminAuditLogRow }) {
  const absoluteTimestamp = formatAbsoluteTimestamp(entry.createdAt);
  const isoTimestamp = formatIsoTimestamp(entry.createdAt);
  const actionLabel = formatActionLabel(entry.action);
  const targetTypeLabel = formatTargetTypeLabel(entry.targetType);
  const targetIdDisplay = formatTargetIdForDisplay(entry.targetId);
  const metadataExcerpt = formatMetadataExcerpt(entry.metadata);
  const metadataPretty = formatMetadataPretty(entry.metadata);
  const ipAddress = entry.ipAddress ?? "—";
  const userAgent = entry.userAgent ?? "—";

  return (
    <TableRow>
      <TableCell className="align-top w-[12rem]">
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="text-sm font-medium text-foreground cursor-default truncate"
                suppressHydrationWarning
              >
                {absoluteTimestamp}
              </span>
            </TooltipTrigger>
            <TooltipContent suppressHydrationWarning>
              {isoTimestamp}
            </TooltipContent>
          </Tooltip>
          <span
            className="font-mono text-xs text-muted-foreground truncate"
            suppressHydrationWarning
          >
            {isoTimestamp}
          </span>
        </div>
      </TableCell>

      <TableCell className="align-top w-[14rem]">
        <div className="flex flex-col gap-1">
          <TruncatedTextWithTooltip
            className="text-sm font-medium text-foreground"
            text={entry.adminEmail}
          />
          {entry.adminUserId ? (
            <span className="font-mono text-xs text-muted-foreground">
              <TruncatedTextWithTooltip
                className="font-mono text-xs text-muted-foreground"
                text={entry.adminUserId}
              />
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">(removed)</span>
          )}
        </div>
      </TableCell>

      <TableCell className="align-top w-[14rem]">
        <div className="flex flex-col items-start gap-1.5">
          <Badge variant={getActionBadgeVariant(entry.action)}>
            {actionLabel}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {entry.action}
          </span>
        </div>
      </TableCell>

      <TableCell className="align-top w-[16rem]">
        <div className="flex flex-col gap-1">
          <span className="meta-label">{targetTypeLabel}</span>
          <TruncatedTextWithTooltip
            className="font-mono text-sm text-foreground"
            text={targetIdDisplay}
          />
        </div>
      </TableCell>

      <TableCell className="align-top w-[14rem]">
        {metadataExcerpt ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate font-mono text-xs leading-5 text-muted-foreground cursor-default">
                {metadataExcerpt}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md whitespace-pre-wrap break-words">
              <pre className="font-mono text-xs leading-5">
                {metadataPretty ?? metadataExcerpt}
              </pre>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="align-top w-[12rem]">
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate font-mono text-xs text-foreground cursor-default">
                {ipAddress}
              </span>
            </TooltipTrigger>
            <TooltipContent>{ipAddress}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate text-xs text-muted-foreground cursor-default">
                {userAgent}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md whitespace-pre-wrap break-words">
              {userAgent}
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
