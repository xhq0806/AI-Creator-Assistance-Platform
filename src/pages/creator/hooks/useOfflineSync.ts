import { useEffect, useState, useCallback } from "react";
import { message } from "antd";
import {
  syncOfflineDrafts,
} from "@/services/api";
import {
  listDirtyDrafts,
  markDraftSynced,
} from "@/utils/offlineDraft";

export function useOfflineSync(currentUserId: number | undefined) {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setOnline(false);
    const handleOnline = () => setOnline(true);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const flushOfflineDrafts = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const dirty = await listDirtyDrafts(currentUserId);
      if (!dirty.length) return;

      const result = await syncOfflineDrafts(dirty);
      if (!result || !result.results) return;

      await Promise.all(
        result.results
          .filter((item: any) => item.localId && !item.skipped)
          .map((item: any) => markDraftSynced(item.localId, item.serverId))
      );
      message.success(`已静默同步 ${result.synced} 份离线草稿`);
    } catch {
      // 离线同步失败时静默处理，避免阻塞用户操作
    }
  }, [currentUserId]);

  // Auto-flush when coming back online
  useEffect(() => {
    if (online && currentUserId) {
      void flushOfflineDrafts();
    }
  }, [online, flushOfflineDrafts, currentUserId]);

  return { online, flushOfflineDrafts };
}
