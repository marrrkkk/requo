export function getDashboardTourStorageKey(businessId: string) {
  return `requo:tour:dashboard:${businessId}`;
}

export const DASHBOARD_TOUR_DEV_SHOW_EVENT = "requo:dev:show-dashboard-tour";

export function clearDashboardTourLocalStorage(businessId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(getDashboardTourStorageKey(businessId));
  } catch {
    // localStorage unavailable
  }
}
