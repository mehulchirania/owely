export interface SyncedContactResult {
  name: string;
  phone: string;
  onOwely: boolean;
  matchedName?: string;
  matchedPhotoURL?: string | null;
}

export interface SyncContactsSummary {
  added: number;
  matched: number;
  invalid: number;
  contacts: SyncedContactResult[];
}
