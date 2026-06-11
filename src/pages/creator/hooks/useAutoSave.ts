import { useEffect, useCallback, useRef, type RefObject } from "react";
import type { FormInstance } from "antd";
import { message } from "antd";
import {
  saveDraft,
  type ArticleDraft,
} from "@/services/api";
import {
  createLocalDraftId,
  persistOfflineDraft,
  type OfflineDraft,
} from "@/utils/offlineDraft";

const AUTOSAVE_INTERVAL = 30_000;

type UseAutoSaveOptions = {
  online: boolean;
  articleId: number | undefined;
  currentUserId: number | undefined;
  mediaUrls: string[];
  articleCategory: string;
  localDraftId: RefObject<string>;
  publishingRef: RefObject<boolean>;
  form: FormInstance;
  setArticleId: (id: number | undefined) => void;
};

export function useAutoSave({
  online,
  articleId,
  currentUserId,
  mediaUrls,
  articleCategory,
  localDraftId,
  publishingRef,
  form,
  setArticleId,
}: UseAutoSaveOptions) {
  // Ref to track the latest articleId for the auto-save timer
  // so it can update after first auto-save creates a draft
  const articleIdRef = useRef(articleId);
  articleIdRef.current = articleId;

  const doSave = useCallback(
    async (showToast = true): Promise<number | undefined> => {
      if (!currentUserId || publishingRef.current) {
        return articleIdRef.current;
      }

      const values = form.getFieldsValue();
      const rawTitle = (values.title || "").trim();
      const rawContent = (values.content || "").trim();
      const hasMeaningful = Boolean(
        rawContent || (rawTitle && rawTitle !== "未命名草稿") || mediaUrls.length
      );

      if (!hasMeaningful) {
        return undefined;
      }

      const draft: ArticleDraft = {
        id: articleIdRef.current,
        title: rawTitle || "未命名草稿",
        content: values.content || "",
        media_urls: mediaUrls,
        category: articleCategory || undefined,
        status: "draft",
        prompt: (values.prompt || "").trim(),
      };

      if (!online) {
        await persistOfflineDraft({
          ...draft,
          localId: localDraftId.current,
          userId: currentUserId,
          updatedAt: Date.now(),
          dirty: true,
        } as OfflineDraft);
        if (showToast) {
          message.info("已保存到本地 IndexedDB，网络恢复后自动同步");
        }
        return undefined;
      }

      try {
        const saved = await saveDraft(draft);
        if (showToast) {
          message.success("草稿保存成功");
        }
        return saved.id;
      } catch {
        await persistOfflineDraft({
          ...draft,
          localId: localDraftId.current,
          userId: currentUserId,
          updatedAt: Date.now(),
          dirty: true,
        } as OfflineDraft);
        if (showToast) {
          message.warning("保存失败，已保存到本地，网络恢复后可手动同步");
        }
        return undefined;
      }
    },
    [online, currentUserId, mediaUrls, articleCategory, form, localDraftId, publishingRef]
  );

  // Manual save: save then reset articleId so next save creates a NEW draft
  const saveAndReset = useCallback(async (): Promise<void> => {
    const id = await doSave(true);
    if (id) {
      setArticleId(undefined);
    }
  }, [doSave, setArticleId]);

  // Periodic auto-save: continues editing the same draft
  useEffect(() => {
    const timer = window.setInterval(() => {
      void doSave(false).then((id) => {
        // If auto-save created the first draft, remember its id
        // so subsequent auto-saves UPDATE instead of creating duplicates
        if (id && !articleIdRef.current) {
          setArticleId(id);
        }
      });
    }, AUTOSAVE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [doSave, setArticleId]);

  return { saveDraft: doSave, saveAndReset };
}
