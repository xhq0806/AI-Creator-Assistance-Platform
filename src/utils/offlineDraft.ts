import localforage from 'localforage';
import type { ArticleDraft } from '@/services/api';

export type OfflineDraft = ArticleDraft & {
  localId: string;
  userId: number;
  updatedAt: number;
  dirty: boolean;
};

const draftStore = localforage.createInstance({
  name: 'ai_creator_platform',
  storeName: 'offline_drafts',
  description: 'AI creator editor offline draft queue',
});

export function createLocalDraftId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function persistOfflineDraft(draft: OfflineDraft) {
  await draftStore.setItem(draft.localId, {
    ...draft,
    updatedAt: Date.now(),
    dirty: true,
  });
}

export async function listDirtyDrafts(userId: number) {
  const drafts: OfflineDraft[] = [];
  await draftStore.iterate<OfflineDraft, void>((value) => {
    if (value.userId === userId && value.dirty) {
      drafts.push(value);
    }
  });
  return drafts.sort((a, b) => a.updatedAt - b.updatedAt);
}

export async function getLatestLocalDraft(userId: number) {
  const drafts: OfflineDraft[] = [];
  await draftStore.iterate<OfflineDraft, void>((value) => {
    if (value.userId === userId) {
      drafts.push(value);
    }
  });

  return drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function markDraftSynced(localId: string, serverId?: number) {
  const draft = await draftStore.getItem<OfflineDraft>(localId);
  if (!draft) {
    return;
  }

  await draftStore.setItem(localId, {
    ...draft,
    id: serverId || draft.id,
    dirty: false,
    updatedAt: Date.now(),
  });
}
