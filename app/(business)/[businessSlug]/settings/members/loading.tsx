import { MembersStaticFallback } from "@/features/business-members/components/business-members-manager";

/**
 * Mirrors BusinessMembersSettingsPage: the static section title and
 * description paint instantly, only the DB-backed member list shows
 * skeletons — no full-page gray flash.
 */
export default function BusinessMembersSettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Manage Members
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Manage the members of this business here.
        </p>
      </div>
      <MembersStaticFallback />
    </div>
  );
}
