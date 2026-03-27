/** O(1) average lookup by `_id` after one O(n) build. */
export function byIdMap<T extends { _id: string }>(items: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const item of items) {
    m.set(item._id, item);
  }
  return m;
}

/**
 * After a new message, move that conversation to the front in O(n) without sorting the whole list.
 * (Previously: map + sort = O(n log n) per socket event.)
 */
export function bumpConversationToFront<T extends { _id: string; updatedAt: string }>(
  list: T[],
  conversationId: string,
  updatedAt: string,
): T[] {
  const cid = String(conversationId);
  const idx = list.findIndex((c) => String(c._id) === cid);
  if (idx === -1) return list;
  const updated = { ...list[idx], updatedAt } as T;
  const next = list.slice();
  next.splice(idx, 1);
  next.unshift(updated);
  return next;
}
