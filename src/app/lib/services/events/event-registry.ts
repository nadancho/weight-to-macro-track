import type { DailyLogsRow, ProfilesRow } from "@/app/lib/integrations/supabase/types";

export type EventType = "log:saved" | "profile:updated";

export type EventPayload = {
  "log:saved": { userId: string; log: DailyLogsRow };
  "profile:updated": { userId: string; profile: ProfilesRow };
};

type Handler<T extends EventType> = (payload: EventPayload[T]) => Promise<void>;

const handlers = new Map<EventType, Handler<never>[]>();

export function registerHandler<T extends EventType>(
  event: T,
  handler: Handler<T>,
): void {
  const list = handlers.get(event) ?? [];
  list.push(handler as Handler<never>);
  handlers.set(event, list);
}

export async function emit<T extends EventType>(
  event: T,
  payload: EventPayload[T],
): Promise<void> {
  const list = handlers.get(event) ?? [];
  await Promise.all(list.map((h) => h(payload as never)));
}
