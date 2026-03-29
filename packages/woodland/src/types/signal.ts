/** A signal emitted by the host app when something happens. */
export interface Signal {
  type: string;
  payload: Record<string, unknown>;
  userId: string;
  timestamp: Date;
}
