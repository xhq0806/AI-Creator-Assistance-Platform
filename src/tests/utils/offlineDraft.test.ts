import {
  createLocalDraftId,
  persistOfflineDraft,
  listDirtyDrafts,
  getLatestLocalDraft,
  markDraftSynced,
} from "@/utils/offlineDraft";
import localforage from "localforage";
import type { ArticleDraft } from "@/services/api";

// localforage operations are async; we test against a real localforage
// instance since it works in-memory in jsdom.

function makeDraft(overrides: Partial<ArticleDraft> & { localId: string; userId: number } = {}) {
  const draft = {
    localId: overrides.localId || createLocalDraftId(),
    userId: overrides.userId ?? 1,
    title: overrides.title || "Test Draft",
    content: overrides.content || "Test content",
    media_urls: overrides.media_urls || [],
    status: (overrides.status as ArticleDraft["status"]) || "draft",
    updatedAt: Date.now(),
    dirty: overrides.dirty !== undefined ? overrides.dirty : true,
  };
  return draft;
}

describe("offlineDraft", () => {
  beforeEach(async () => {
    await localforage.clear();
  });

  describe("createLocalDraftId", () => {
    it("generates a string prefixed with local_", () => {
      const id = createLocalDraftId();
      expect(id).toMatch(/^local_\d+_\w+$/);
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => createLocalDraftId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("persistOfflineDraft", () => {
    it("stores a draft and marks it dirty", async () => {
      const draft = makeDraft();
      await persistOfflineDraft(draft);

      const stored = await localforage.getItem(draft.localId);
      expect(stored).toBeTruthy();
      expect((stored as any).dirty).toBe(true);
    });

    it("updates timestamp on persist", async () => {
      const draft = makeDraft({ updatedAt: 1000 });
      await persistOfflineDraft(draft);

      const stored = await localforage.getItem(draft.localId);
      expect((stored as any).updatedAt).toBeGreaterThan(1000);
    });
  });

  describe("listDirtyDrafts", () => {
    it("returns only dirty drafts for the given user", async () => {
      const d1 = makeDraft({ localId: "l1", userId: 1, dirty: true });
      const d2 = makeDraft({ localId: "l2", userId: 1, dirty: false });
      const d3 = makeDraft({ localId: "l3", userId: 2, dirty: true });

      await persistOfflineDraft(d1);
      await persistOfflineDraft({ ...d2, dirty: false });
      await persistOfflineDraft(d3);

      const dirty = await listDirtyDrafts(1);
      expect(dirty).toHaveLength(1);
      expect(dirty[0].localId).toBe("l1");
    });

    it("sorts by updatedAt ascending", async () => {
      const d1 = makeDraft({ localId: "a", userId: 1, updatedAt: 3000 });
      const d2 = makeDraft({ localId: "b", userId: 1, updatedAt: 1000 });
      const d3 = makeDraft({ localId: "c", userId: 1, updatedAt: 2000 });

      await persistOfflineDraft(d1);
      await persistOfflineDraft(d2);
      await persistOfflineDraft(d3);

      const dirty = await listDirtyDrafts(1);
      expect(dirty.map((d) => d.localId)).toEqual(["b", "c", "a"]);
    });
  });

  describe("getLatestLocalDraft", () => {
    it("returns the most recently updated draft for the user", async () => {
      const d1 = makeDraft({ localId: "old", userId: 1, updatedAt: 1000 });
      const d2 = makeDraft({ localId: "new", userId: 1, updatedAt: 5000 });

      await persistOfflineDraft(d1);
      await persistOfflineDraft(d2);

      const latest = await getLatestLocalDraft(1);
      expect(latest?.localId).toBe("new");
    });

    it("returns undefined when user has no drafts", async () => {
      const latest = await getLatestLocalDraft(999);
      expect(latest).toBeUndefined();
    });
  });

  describe("markDraftSynced", () => {
    it("marks a draft as not dirty and updates server id", async () => {
      const draft = makeDraft({ localId: "sync-test" });
      await persistOfflineDraft(draft);
      await markDraftSynced("sync-test", 42);

      const stored = await localforage.getItem("sync-test");
      expect((stored as any).dirty).toBe(false);
      expect((stored as any).id).toBe(42);
    });

    it("does nothing for non-existent drafts", async () => {
      await expect(markDraftSynced("nonexistent", 1)).resolves.toBeUndefined();
    });
  });
});
