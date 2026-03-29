import type { AvatarSelections } from "./avatar";

/** Snapshot of everything a player owns and has configured. */
export interface PlayerState {
  ownedIds: Set<string>;
  progress: Map<string, number>;
  avatar: AvatarSelections;
  activeThemeId: string;
}

/** Storage adapter — the only interface the host app must implement. */
export interface PlayerStateAdapter {
  getPlayerState(userId: string): Promise<PlayerState>;
  awardCollectible(userId: string, collectibleId: string): Promise<void>;
  saveAvatar(userId: string, avatar: AvatarSelections): Promise<void>;
  saveTheme(userId: string, themeId: string): Promise<void>;
}
