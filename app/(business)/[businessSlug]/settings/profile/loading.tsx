import { DashboardSettingsProfileSkeleton } from "@/components/shell/dashboard-settings-skeleton";

/**
 * Mirrors SettingsProfilePage: sr-only title is static chrome that paints
 * instantly, only the profile body streams behind its component skeleton.
 */
export default function BusinessProfileSettingsLoading() {
  return (
    <>
      <h1 className="sr-only">Profile</h1>
      <DashboardSettingsProfileSkeleton />
    </>
  );
}
