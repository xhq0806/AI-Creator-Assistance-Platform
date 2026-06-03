import { useEffect, useCallback, type RefObject } from "react";
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
}: UseAutoSaveOptions) {
  const doSave = useCallback(
    async (showToast = true): Promise<number | undefined> => {
      if (!currentUserId || publishingRef.current) {
        return articleId;
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
        id: articleId,
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
          message.success('草稿保存成功');
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
          message.warning('保存失败，已保存到本地，网络恢复后可手动同步');
        }
        return undefined;
      }
    },
    [online, articleId, currentUserId, mediaUrls, articleCategory, form, localDraftId, publishingRef]
  );

  // Periodic auto-save
  useEffect(() => {
    const timer = window.setInterval(() => {
      void doSave(false);
    }, AUTOSAVE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [doSave]);

  return { saveDraft: doSave };
}
