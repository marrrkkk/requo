export const OPTIMISTIC_ID_PREFIX = "optimistic_";

export function createOptimisticId() {
  return `${OPTIMISTIC_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isOptimisticId(id: string) {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}
