import { useState, useRef, useCallback } from "react";
import type { FormInstance } from "antd";
import { message } from "antd";
import {
  generateContent,
  generateImage,
  generateVideo,
} from "@/services/api";

type UseAIOptions = {
  form: FormInstance;
  mediaUrls: string[];
  setMediaUrls: (value: string[] | ((prev: string[]) => string[])) => void;
};

export function useAI({ form, mediaUrls, setMediaUrls }: UseAIOptions) {
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generateMode, setGenerateMode] = useState<
    "full_generation" | "structured" | "rewrite" | "outline"
  >("full_generation");

  const abortRef = useRef<AbortController | null>(null);
  const imageAbortRef = useRef<AbortController | null>(null);
  const videoAbortRef = useRef<AbortController | null>(null);
  const activeHistoryIdRef = useRef<number | undefined>();

  const setActiveHistoryId = useCallback((id?: number) => {
    activeHistoryIdRef.current = id;
  }, []);

  const handleGenerate = useCallback(async () => {
    const prompt = form.getFieldValue("prompt");
    if (!prompt) {
      message.warning("请输入创作提示词");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    try {
      const generated = await generateContent(
        { prompt, mode: generateMode, materials: mediaUrls },
        controller.signal
      );
      form.setFieldsValue(generated);
      if (generated.history_id) {
        activeHistoryIdRef.current = generated.history_id;
      }
      message.success("AI 内容已生成");
    } catch (error: any) {
      if (error instanceof DOMException && error.name === "AbortError") {
        message.info("已停止生成");
        return;
      }
      message.error(error instanceof Error ? error.message : "AI 生成失败");
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }, [form, generateMode, mediaUrls]);

  const handleGenerateImage = useCallback(async () => {
    const values = form.getFieldsValue();
    const hasPrompt = Boolean(
      String(values.prompt || "").trim() ||
        String(values.title || "").trim() ||
        String(values.content || "").trim()
    );
    if (!hasPrompt) {
      message.warning("请先输入创作提示词、标题或正文");
      return;
    }
    if (!activeHistoryIdRef.current) {
      message.warning("请先点击「AI 生成」，再生成配图，以确保配图归入正确的生成历史");
      return;
    }

    const controller = new AbortController();
    imageAbortRef.current = controller;
    setGeneratingImage(true);
    try {
      const result = await generateImage(
        {
          prompt: values.prompt,
          title: values.title,
          content: values.content,
          materials: mediaUrls,
          history_id: activeHistoryIdRef.current,
        },
        controller.signal
      );
      if (result.history_id) {
        activeHistoryIdRef.current = result.history_id;
      }
      setMediaUrls(result.media_urls);
      if (result.provider === "placeholder") {
        message.warning("当前为占位图（未配置文生图 API）");
      } else {
        message.success("AI 配图已生成");
      }
    } catch (error: any) {
      if (error instanceof DOMException && error.name === "AbortError") {
        message.info("已停止生成配图");
        return;
      }
      message.error(error instanceof Error ? error.message : "AI 配图生成失败");
    } finally {
      setGeneratingImage(false);
      imageAbortRef.current = null;
    }
  }, [form, mediaUrls, setMediaUrls]);

  const handleGenerateVideo = useCallback(async () => {
    const values = form.getFieldsValue();
    const hasPrompt = Boolean(
      String(values.prompt || "").trim() ||
        String(values.title || "").trim() ||
        String(values.content || "").trim()
    );
    if (!hasPrompt) {
      message.warning("请先输入创作提示词、标题或正文");
      return;
    }
    if (!activeHistoryIdRef.current) {
      message.warning("请先点击「AI 生成」，再生成视频，以确保素材归入正确的生成历史");
      return;
    }

    const controller = new AbortController();
    videoAbortRef.current = controller;
    setGeneratingVideo(true);
    try {
      const result = await generateVideo(
        {
          prompt: values.prompt,
          title: values.title,
          content: values.content,
          materials: mediaUrls,
          history_id: activeHistoryIdRef.current,
        },
        controller.signal
      );
      if (result.history_id) {
        activeHistoryIdRef.current = result.history_id;
      }
      setMediaUrls((current) => Array.from(new Set([...result.media_urls, ...current])));
      message.success("AI 视频已生成并加入素材列表");
    } catch (error: any) {
      if (error instanceof DOMException && error.name === "AbortError") {
        message.info("已停止生成视频");
        return;
      }
      message.error(error instanceof Error ? error.message : "AI 视频生成失败");
    } finally {
      setGeneratingVideo(false);
      videoAbortRef.current = null;
    }
  }, [form, mediaUrls, setMediaUrls]);

  return {
    generating,
    generatingImage,
    generatingVideo,
    generateMode,
    setGenerateMode,
    setActiveHistoryId,
    handleGenerate,
    handleStopGenerate: () => abortRef.current?.abort(),
    handleGenerateImage,
    handleStopGenerateImage: () => imageAbortRef.current?.abort(),
    handleGenerateVideo,
    handleStopGenerateVideo: () => videoAbortRef.current?.abort(),
  };
}
