import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import {
  LoadingOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  DeleteOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { history, useLocation, useModel, useParams } from "umi";
import {
  auditContent,
  createMaterial,
  createPromptTemplate,
  deleteMaterial,
  deletePromptTemplate,
  evaluateQuality,
  fetchArticle,
  fetchLatestDraft,
  fetchMaterials,
  fetchPromptTemplates,
  generateContent,
  generateImage,
  generateVideo,
  getUploadCredential,
  confirmUpload,
  markPromptTemplateUsed,
  saveDraft,
  syncDistribution,
  syncOfflineDrafts,
  type ArticleDraft,
  type AuditResult,
  type MaterialItem,
  type PromptTemplate,
  type UploadCredential,
} from "@/services/api";
import {
  createLocalDraftId,
  getLatestLocalDraft,
  listDirtyDrafts,
  markDraftSynced,
  persistOfflineDraft,
} from "@/utils/offlineDraft";
import styles from "./index.less";

const AUTOSAVE_INTERVAL = 30_000;

type CreatorForm = ArticleDraft & {
  prompt: string;
};

type QualityResult = {
  quality_score: number;
  structure: number;
  depth: number;
  fluency: number;
  reason: string;
};

type RichContentEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToHtml(value: string) {
  return value
    .split(/\n/)
    .map((line) => {
      const html = escapeHtml(line).replace(
        /\*\*([^*]+)\*\*/g,
        "<strong>$1</strong>"
      );
      return html ? `<p>${html}</p>` : "<p><br /></p>";
    })
    .join("");
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const children = Array.from(node.childNodes).map(nodeToMarkdown).join("");
  const tagName = node.tagName.toLowerCase();

  if (tagName === "strong" || tagName === "b") {
    return `**${children}**`;
  }
  if (tagName === "br") {
    return "\n";
  }
  if (tagName === "p" || tagName === "div") {
    return `${children}\n`;
  }

  return children;
}

function RichContentEditor({
  value = "",
  onChange,
  placeholder,
}: RichContentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) {
      return;
    }

    editor.innerHTML = value ? markdownToHtml(value) : "";
  }, [value]);

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const markdown = Array.from(event.currentTarget.childNodes)
      .map(nodeToMarkdown)
      .join("")
      .trim();
    onChange?.(markdown);
  }

  return (
    <div
      ref={editorRef}
      className={styles.richEditor}
      contentEditable
      data-placeholder={placeholder}
      onInput={handleInput}
      suppressContentEditableWarning
    />
  );
}

function isVideoUrl(url: string) {
  return url.startsWith("data:video/") || /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

function isImageUrl(url: string) {
  return (
    url.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url) ||
    (/^https?:\/\//i.test(url) && !isVideoUrl(url))
  );
}

export default function CreatorPage() {
  const params = useParams();
  const location = useLocation();
  const { currentUser, isLoggedIn } = useModel("auth");
  const [form] = Form.useForm<CreatorForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult>();
  const [qualityResult, setQualityResult] = useState<QualityResult>();
  const [articleId, setArticleId] = useState<number>();
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [promptName, setPromptName] = useState("");
  const [promptCategory, setPromptCategory] = useState("通用");
  const [loadedStatus, setLoadedStatus] =
    useState<ArticleDraft["status"]>("draft");
  const localDraftId = useRef(createLocalDraftId());
  const publishingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const connectivityTag = useMemo(
    () =>
      online ? (
        <Tag color="green">在线自动同步</Tag>
      ) : (
        <Tag color="orange">离线 IndexedDB 保存</Tag>
      ),
    [online]
  );
  const shouldRestoreLatestDraft = useMemo(() => {
    return new URLSearchParams(location.search).get("restore") === "latest";
  }, [location.search]);

  useEffect(() => {
    if (!isLoggedIn) {
      resetEditor();
      history.push("/login");
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      return;
    }

    void hydrateEditor();
    void hydrateWorkspaceResources();
  }, [isLoggedIn, currentUser?.id, params.id, shouldRestoreLatestDraft]);

  useEffect(() => {
    const handleOffline = () => setOnline(false);
    const handleOnline = async () => {
      setOnline(true);
      await flushOfflineDrafts();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void handleSaveDraft(false);
    }, AUTOSAVE_INTERVAL);

    return () => window.clearInterval(timer);
  }, [online, articleId, currentUser?.id]);

  async function flushOfflineDrafts() {
    if (!currentUser) {
      return;
    }

    const dirtyDrafts = await listDirtyDrafts(currentUser.id);
    if (!dirtyDrafts.length) {
      return;
    }

    const result = await syncOfflineDrafts(dirtyDrafts);
    await Promise.all(
      result.results
        .filter((item) => item.localId && !item.skipped)
        .map((item) => markDraftSynced(item.localId as string, item.serverId))
    );
    messageApi.success(`已静默同步 ${result.synced} 份离线草稿`);
  }

  async function hydrateWorkspaceResources() {
    try {
      const [promptList, materialList] = await Promise.all([
        fetchPromptTemplates(),
        fetchMaterials(),
      ]);
      setPromptTemplates(promptList);
      setMaterials(materialList);
    } catch (error) {
      messageApi.warning(
        error instanceof Error
          ? `工作台资源加载失败：${error.message}`
          : "工作台资源加载失败"
      );
    }
  }

  function resetEditor() {
    form.resetFields();
    setArticleId(undefined);
    setAuditResult(undefined);
    setQualityResult(undefined);
    setMediaUrls([]);
    setMaterialInput("");
    setMaterialName("");
    setLoadedStatus("draft");
    localDraftId.current = createLocalDraftId();
  }

  async function hydrateEditor() {
    if (!currentUser) {
      return;
    }

    resetEditor();

    try {
      if (params.id) {
        const article = await fetchArticle(Number(params.id));
        setArticleId(article.id);
        setLoadedStatus(article.status);
        setMediaUrls(article.media_urls || []);
        form.setFieldsValue({
          title: article.title,
          content: article.content,
          media_urls: article.media_urls || [],
        });
        return;
      }

      if (!shouldRestoreLatestDraft) {
        return;
      }

      const localDraft = await getLatestLocalDraft(currentUser.id);
      if (!online && localDraft) {
        setArticleId(localDraft.id);
        setMediaUrls(localDraft.media_urls || []);
        form.setFieldsValue(localDraft);
        messageApi.info("已恢复本地离线草稿");
        return;
      }

      const cloudDraft = online ? await fetchLatestDraft() : null;
      const draft = cloudDraft || localDraft;
      if (draft) {
        setArticleId(draft.id);
        setMediaUrls(draft.media_urls || []);
        form.setFieldsValue(draft);
        messageApi.success(
          cloudDraft ? "已恢复上次云端草稿" : "已恢复本地草稿"
        );
      }
    } catch (error) {
      messageApi.warning(
        error instanceof Error
          ? `草稿恢复失败：${error.message}`
          : "草稿恢复失败"
      );
    }
  }

  async function handleSaveDraft(
    showToast = true
  ): Promise<number | undefined> {
    if (!currentUser) {
      return undefined;
    }
    if (publishingRef.current) {
      if (showToast) {
        messageApi.info("正在审核并发布，请稍候");
      }
      return articleId;
    }

    const values = form.getFieldsValue();
    const rawTitle = values.title?.trim() || "";
    const rawContent = values.content?.trim() || "";
    const hasMeaningfulDraft = Boolean(
      rawContent || (rawTitle && rawTitle !== "未命名草稿") || mediaUrls.length
    );

    if (!hasMeaningfulDraft) {
      if (showToast) {
        messageApi.info("当前没有可保存的草稿内容");
      }
      return undefined;
    }

    const draft: ArticleDraft = {
      id: articleId,
      title: rawTitle || "未命名草稿",
      content: values.content || "",
      media_urls: mediaUrls,
      status: "draft",
    };

    setSaving(true);
    try {
      if (!online) {
        await persistOfflineDraft({
          ...draft,
          localId: localDraftId.current,
          userId: currentUser.id,
          updatedAt: Date.now(),
          dirty: true,
        });
        if (showToast) {
          messageApi.info("已保存到本地 IndexedDB，网络恢复后自动同步");
        }
        return undefined;
      }

      const savedDraft = await saveDraft(draft);
      setArticleId(savedDraft.id);
      if (showToast) {
        messageApi.success("草稿已保存");
      }
      return savedDraft.id;
    } catch (error) {
      await persistOfflineDraft({
        ...draft,
        localId: localDraftId.current,
        userId: currentUser.id,
        updatedAt: Date.now(),
        dirty: true,
      });
      messageApi.warning(
        error instanceof Error
          ? `后端保存失败，已转存本地：${error.message}`
          : "已转存本地"
      );
      return undefined;
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    const prompt = form.getFieldValue("prompt");
    if (!prompt) {
      messageApi.warning("请输入创作提示词");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGenerating(true);
    try {
      const generated = await generateContent(
        {
          prompt,
          mode: "full_generation",
          materials: mediaUrls,
        },
        controller.signal
      );
      form.setFieldsValue(generated);
      messageApi.success("AI 内容已生成");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        messageApi.info("已停止生成");
        return;
      }
      messageApi.error(error instanceof Error ? error.message : "AI 生成失败");
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  }

  function handleStopGenerate() {
    abortControllerRef.current?.abort();
  }

  async function handleGenerateImage() {
    const values = form.getFieldsValue();
    const hasPrompt = Boolean(
      String(values.prompt || "").trim() ||
        String(values.title || "").trim() ||
        String(values.content || "").trim()
    );
    if (!hasPrompt) {
      messageApi.warning("请先输入创作提示词、标题或正文");
      return;
    }

    setGeneratingImage(true);
    try {
      const result = await generateImage({
        prompt: values.prompt,
        title: values.title,
        content: values.content,
        materials: mediaUrls,
      });
      setMediaUrls(result.media_urls);
      if (result.provider === "placeholder") {
        messageApi.warning(
          "当前为占位图（未配置文生图 API），请在服务端配置 ARK_API_KEY 与 ARK_IMAGE_MODEL"
        );
      } else {
        messageApi.success("AI 配图已生成");
      }
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "AI 配图生成失败"
      );
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleGenerateVideo() {
    const values = form.getFieldsValue();
    const hasPrompt = Boolean(
      String(values.prompt || "").trim() ||
        String(values.title || "").trim() ||
        String(values.content || "").trim()
    );
    if (!hasPrompt) {
      messageApi.warning("请先输入创作提示词、标题或正文");
      return;
    }

    setGeneratingVideo(true);
    try {
      const result = await generateVideo({
        prompt: values.prompt,
        title: values.title,
        content: values.content,
        materials: mediaUrls,
      });
      setMediaUrls((current) =>
        Array.from(new Set([...result.media_urls, ...current]))
      );
      messageApi.success("AI 视频已生成并加入素材列表");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "AI 视频生成失败"
      );
    } finally {
      setGeneratingVideo(false);
    }
  }

  function applySafeAlternative() {
    if (!auditResult?.safe_alternative) {
      messageApi.info("当前没有可应用的合规替代文本");
      return;
    }

    form.setFieldValue("content", auditResult.safe_alternative);
    messageApi.success("已应用合规替代内容");
  }

  async function savePromptTemplate() {
    const content = String(form.getFieldValue("prompt") || "").trim();
    const name = promptName.trim();
    if (!name || !content) {
      messageApi.warning("请填写模板名称，并在创作提示词中准备模板内容");
      return;
    }

    try {
      const prompt = await createPromptTemplate({
        name,
        category: promptCategory || "通用",
        content,
      });
      setPromptTemplates((current) => [prompt, ...current]);
      setPromptName("");
      messageApi.success("Prompt 模板已保存");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Prompt 模板保存失败"
      );
    }
  }

  async function applyPromptTemplate(template: PromptTemplate) {
    form.setFieldValue("prompt", template.content);
    try {
      const updated = await markPromptTemplateUsed(template.id);
      setPromptTemplates((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch {
      // 使用计数失败不阻塞创作。
    }
  }

  async function removePromptTemplate(template: PromptTemplate) {
    try {
      await deletePromptTemplate(template.id);
      setPromptTemplates((current) =>
        current.filter((item) => item.id !== template.id)
      );
      messageApi.success("Prompt 模板已删除");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Prompt 模板删除失败"
      );
    }
  }

  async function addMaterial() {
    const url = materialInput.trim();
    if (!url) {
      messageApi.warning("请输入素材 URL");
      return;
    }

    try {
      const material = await createMaterial({
        name: materialName.trim() || "未命名素材",
        url,
      });
      setMaterials((current) => [material, ...current]);
      setMediaUrls((current) =>
        Array.from(new Set([...current, material.url]))
      );
      setMaterialName("");
      setMaterialInput("");
      messageApi.success("素材已通过基础校验并加入素材库");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "素材添加失败");
    }
  }

  async function removeMaterial(item: MaterialItem) {
    try {
      await deleteMaterial(item.id);
      setMaterials((current) =>
        current.filter((material) => material.id !== item.id)
      );
      setMediaUrls((current) => current.filter((url) => url !== item.url));
      messageApi.success("素材已删除");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "素材删除失败");
    }
  }

  async function handleAudit() {
    const values = form.getFieldsValue();
    setAuditing(true);
    try {
      const result = await auditContent({
        prompt: values.prompt || "",
        title: values.title || "",
        content: values.content || "",
      });
      setAuditResult(result);
      messageApi[result.is_compliant ? "success" : "warning"](result.reason);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "审核失败");
    } finally {
      setAuditing(false);
    }
  }

  async function handleQualityScore() {
    const values = form.getFieldsValue();
    if (!values.title?.trim() || !values.content?.trim()) {
      messageApi.warning("请先完善标题和正文");
      return;
    }

    setScoring(true);
    try {
      const result = await evaluateQuality({
        title: values.title,
        content: values.content,
      });
      setQualityResult(result);
      messageApi.success(`质量评分 ${Math.round(result.quality_score)} 分`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "质量评分失败");
    } finally {
      setScoring(false);
    }
  }

  async function handleDistribution() {
    const targetArticleId = articleId || (await handleSaveDraft(false));

    if (!targetArticleId) {
      messageApi.warning("请先保存草稿后再分发");
      return;
    }

    const result = await syncDistribution({
      article_id: targetArticleId,
      platforms: ["toutiao", "douyin"],
    });
    messageApi.success(`模拟分发完成：${result.sync_status}`);
  }

  async function handlePublish() {
    if (publishingRef.current) {
      messageApi.info("正在审核、评分并发布，请勿重复点击");
      return;
    }

    const values = form.getFieldsValue();
    const title = values.title || "";
    const content = values.content || "";
    if (!title.trim() || !content.trim()) {
      messageApi.warning("请先完善标题和正文");
      return;
    }

    publishingRef.current = true;
    setPublishing(true);
    setSaving(true);
    try {
      messageApi.loading({
        content: "正在审核、评分并发布，请稍候...",
        key: "publish",
        duration: 0,
      });
      const savedArticle = await saveDraft({
        id: articleId,
        title,
        content,
        media_urls: mediaUrls,
        status: "published",
        auto_fix: true,
      });
      setArticleId(savedArticle.id);
      setLoadedStatus("published");
      messageApi.success({
        content: savedArticle.auto_fixed
          ? "内容已自动改写为合规版本并发布"
          : "内容已通过审核并发布",
        key: "publish",
      });
      resetEditor();
      history.push(`/article/${savedArticle.id}`);
    } catch (error) {
      messageApi.destroy("publish");
      messageApi.error(error instanceof Error ? error.message : "发布失败");
    } finally {
      publishingRef.current = false;
      setPublishing(false);
      setSaving(false);
    }
  }

  return (
    <div className={styles.workspace}>
      {contextHolder}
      <div className={styles.contentGrid}>
        <Card className={styles.editorCard}>
          <div className={styles.status}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              灵感创作工作台{" "}
              {loadedStatus === "published" ? (
                <Tag color="blue">二次编辑</Tag>
              ) : null}
            </Typography.Title>
            {connectivityTag}
          </div>
          <div className={styles.toolbar}>
            <Button
              type="primary"
              icon={generating ? <LoadingOutlined /> : <ThunderboltOutlined />}
              onClick={generating ? handleStopGenerate : handleGenerate}
            >
              {generating ? "停止生成" : "AI 生成"}
            </Button>
            <Button loading={generatingImage} onClick={handleGenerateImage}>
              生成配图
            </Button>
            <Button loading={generatingVideo} onClick={handleGenerateVideo}>
              生成视频
            </Button>
            <Button
              icon={<SafetyCertificateOutlined />}
              loading={auditing}
              onClick={handleAudit}
            >
              安全审核
            </Button>
            <Button
              icon={<BarChartOutlined />}
              loading={scoring}
              onClick={handleQualityScore}
            >
              质量评分
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={saving}
              disabled={publishing}
              onClick={() => handleSaveDraft()}
            >
              保存草稿
            </Button>
            <Button
              type="primary"
              ghost
              loading={publishing}
              disabled={publishing}
              onClick={handlePublish}
            >
              审核并发布
            </Button>
            <Button onClick={handleDistribution}>模拟分发</Button>
          </div>
          <Form<CreatorForm>
            form={form}
            layout="vertical"
            onValuesChange={() => !online && void handleSaveDraft(false)}
          >
            <Form.Item name="prompt" label="创作提示词">
              <Input.TextArea
                rows={3}
                placeholder="写一篇关于未来科技趋势的短图文"
              />
            </Form.Item>
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: "请输入标题" }]}
            >
              <Input placeholder="输入图文标题" />
            </Form.Item>
            <Form.Item
              name="content"
              label="正文"
              rules={[{ required: true, message: "请输入正文" }]}
            >
              <RichContentEditor placeholder="开始创作..." />
            </Form.Item>
          </Form>
        </Card>

        <Space direction="vertical" size={16}>
          <Card className={styles.sideCard} title="提示词管理">
            <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
              <Input
                value={promptName}
                onChange={(event) => setPromptName(event.target.value)}
                placeholder="模板名称"
              />
              <Select
                value={promptCategory}
                onChange={(value) => setPromptCategory(value)}
                style={{ minWidth: 120 }}
                placeholder="选择分类"
              >
                <Select.Option value="通用">通用</Select.Option>
                <Select.Option value="文章写作">文章写作</Select.Option>
                <Select.Option value="营销文案">营销文案</Select.Option>
                <Select.Option value="技术开发">技术开发</Select.Option>
                <Select.Option value="创意设计">创意设计</Select.Option>
                <Select.Option value="教育培训">教育培训</Select.Option>
                <Select.Option value="办公效率">办公效率</Select.Option>
                <Select.Option value="代码生成">代码生成</Select.Option>
              </Select>
            </Space.Compact>
            <Button
              block
              style={{ marginBottom: 12 }}
              onClick={savePromptTemplate}
            >
              保存当前提示词为模板
            </Button>
            <Space className={styles.promptList} direction="vertical" size={8}>
              {promptTemplates.map((template) => (
                <Space.Compact key={template.id} style={{ width: "100%" }}>
                  <Button
                    className={styles.promptButton}
                    block
                    title={template.content}
                    onClick={() => applyPromptTemplate(template)}
                  >
                    <span>
                      [{template.category}] {template.name}
                    </span>
                  </Button>
                  {template.user_id ? (
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => removePromptTemplate(template)}
                    />
                  ) : null}
                </Space.Compact>
              ))}
            </Space>
          </Card>
          <Card className={styles.sideCard} title="素材管理与合规校验">
            <Upload
              name="file"
              accept="image/*,video/*,audio/*"
              customRequest={async (options) => {
                const { file, onSuccess, onError, onProgress } = options;
                try {
                  onProgress?.({ percent: 5 });
                  const credential = await getUploadCredential({
                    file_name: (file as File).name,
                    file_type: (file as File).type,
                  });

                  if (credential.provider === "mock_demo") {
                    onProgress?.({ percent: 100 });
                    const fileObj = file as File;
                    if (fileObj.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const localUrl = e.target?.result as string;
                        messageApi.success("演示模式，素材已添加");
                        setMediaUrls((prev) =>
                          Array.from(new Set([...prev, localUrl]))
                        );
                        onSuccess?.({ url: localUrl });
                      };
                      reader.onerror = () => {
                        messageApi.success("演示模式，素材已添加");
                        setMediaUrls((prev) =>
                          Array.from(new Set([...prev, credential.access_url]))
                        );
                        onSuccess?.({ url: credential.access_url });
                      };
                      reader.readAsDataURL(fileObj);
                    } else {
                      messageApi.success("演示模式，素材已添加");
                      setMediaUrls((prev) =>
                        Array.from(new Set([...prev, credential.access_url]))
                      );
                      onSuccess?.({ url: credential.access_url });
                    }
                    return;
                  }

                  onProgress?.({ percent: 10 });
                  const formData = new FormData();
                  formData.append("key", credential.oss_key || "");
                  formData.append("OSSAccessKeyId", credential.access_id || "");
                  formData.append("policy", credential.policy || "");
                  formData.append("signature", credential.signature || "");
                  formData.append("file", file as File);

                  console.log("[阿里云OSS上传] 开始上传，凭证:", credential);
                  const xhr = new XMLHttpRequest();
                  xhr.upload.addEventListener("progress", (event) => {
                    if (event.total > 0) {
                      onProgress?.({
                        percent: Math.round(
                          10 + (event.loaded / event.total) * 85
                        ),
                      });
                    }
                  });
                  xhr.addEventListener("load", async () => {
                    console.log(
                      "[阿里云OSS上传] 响应状态码:",
                      xhr.status,
                      "响应文本:",
                      xhr.responseText
                    );
                    if (
                      xhr.status === 204 ||
                      xhr.status === 200 ||
                      xhr.status === 201
                    ) {
                      onProgress?.({ percent: 98 });
                      await confirmUpload({
                        material_id: credential.material_id!,
                        file_size: (file as File).size,
                        mime_type: (file as File).type,
                      });
                      onProgress?.({ percent: 100 });
                      messageApi.success("素材已上传至阿里云 OSS");
                      setMediaUrls((prev) =>
                        Array.from(new Set([...prev, credential.access_url]))
                      );
                      onSuccess?.({ url: credential.access_url });
                    } else {
                      onError?.(
                        new Error(
                          "上传到阿里云 OSS 失败，HTTP 状态码: " +
                            xhr.status +
                            " 响应: " +
                            xhr.responseText
                        )
                      );
                    }
                  });
                  xhr.addEventListener("error", (e) => {
                    console.error("[阿里云OSS上传] 网络错误详情:", e);
                    console.error(
                      "[阿里云OSS上传] 提示：请检查阿里云OSS Bucket的CORS跨域配置！"
                    );
                    onError?.(
                      new Error("上传失败，最可能是阿里云OSS没有配置跨域规则")
                    );
                  });
                  xhr.open("POST", credential.upload_url);
                  xhr.send(formData);
                } catch (err) {
                  onError?.(err as Error);
                }
              }}
              onChange={(info) => {
                if (info.file.status === "done") {
                  messageApi.success("素材上传完成");
                } else if (info.file.status === "error") {
                  messageApi.error("素材上传失败");
                }
              }}
              maxCount={10}
              multiple
              listType="picture-card"
            >
              <div style={{ padding: 16, textAlign: "center" }}>
                + 选择本地上传
              </div>
            </Upload>
            <Divider />
            <Space direction="vertical" size={8}>
              {materials.map((item) => (
                <Space
                  key={item.id}
                  direction="vertical"
                  size={4}
                  style={{ width: "100%" }}
                >
                  {item.media_type === "image" ? (
                    <img
                      className={styles.materialPreview}
                      src={item.url}
                      alt={item.name}
                    />
                  ) : null}
                  <Space.Compact style={{ width: "100%" }}>
                    <Button
                      block
                      title={item.risk_reason}
                      onClick={() =>
                        setMediaUrls((current) =>
                          Array.from(new Set([...current, item.url]))
                        )
                      }
                    >
                      {item.name}
                    </Button>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => removeMaterial(item)}
                    />
                  </Space.Compact>
                </Space>
              ))}
              {mediaUrls.length ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%",
                  }}
                >
                  {mediaUrls.map((url) => {
                    const isVideo = isVideoUrl(url);
                    const isImage = isImageUrl(url);
                    return (
                      <div
                        key={url}
                        style={{
                          position: "relative",
                          width: "100%",
                          borderRadius: "10px",
                          overflow: "hidden",
                          background: "#1f2937",
                        }}
                      >
                        {isImage ? (
                          <img
                            src={url}
                            alt="素材图片"
                            style={{
                              width: "100%",
                              height: "auto",
                              maxHeight: "220px",
                              objectFit: "contain",
                            }}
                          />
                        ) : isVideo ? (
                          <video
                            src={url}
                            controls
                            style={{
                              width: "100%",
                              height: "auto",
                              maxHeight: "220px",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "120px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9ca3af",
                              fontSize: "16px",
                            }}
                          >
                            非图片素材
                          </div>
                        )}
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            background: "rgba(0,0,0,0.75)",
                            borderRadius: "50%",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "white",
                            fontSize: "20px",
                          }}
                          onClick={() =>
                            setMediaUrls((current) =>
                              current.filter((item) => item !== url)
                            )
                          }
                        >
                          ×
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Typography.Text className={styles.whiteText}>
                  点击上方加号直接从本地选择图片、视频、音频文件上传。
                </Typography.Text>
              )}
            </Space>
          </Card>
          <Card className={styles.sideCard} title="审核免疫系统">
            {auditResult ? (
              <Alert
                className={styles.auditResult}
                type={auditResult.is_compliant ? "success" : "warning"}
                message={
                  auditResult.is_compliant
                    ? "内容合规"
                    : `风险等级：${auditResult.risk_level}`
                }
                description={
                  <Space direction="vertical">
                    <span>{auditResult.reason}</span>
                    <span>
                      置信度：{Math.round(auditResult.accuracy * 100)}%
                    </span>
                    {auditResult.safe_alternative && (
                      <>
                        <span>替代文本：{auditResult.safe_alternative}</span>
                        <Button size="small" onClick={applySafeAlternative}>
                          一键应用合规替代内容
                        </Button>
                      </>
                    )}
                  </Space>
                }
                showIcon
              />
            ) : (
              <Typography.Paragraph className={styles.whiteText}>
                审核会从涉黄、涉赌、涉毒、敏感信息四个维度返回结构化 JSON 结果。
              </Typography.Paragraph>
            )}
          </Card>
          <Card className={styles.sideCard} title="质量评估">
            {qualityResult ? (
              <div className={styles.qualitySection}>
                <Space direction="horizontal" size={8} wrap>
                  <Tag color="blue">
                    综合 {Math.round(qualityResult.quality_score)}
                  </Tag>
                  <Tag>结构 {Math.round(qualityResult.structure)}</Tag>
                  <Tag>深度 {Math.round(qualityResult.depth)}</Tag>
                  <Tag>流畅 {Math.round(qualityResult.fluency)}</Tag>
                </Space>
                <Typography.Paragraph className={styles.whiteText}>
                  {qualityResult.reason}
                </Typography.Paragraph>
              </div>
            ) : (
              <Typography.Paragraph className={styles.whiteText}>
                发布时会自动评分，也可以在编辑过程中手动查看结构、深度、流畅度等子分。
              </Typography.Paragraph>
            )}
          </Card>
          <Card className={styles.sideCard} title="离线策略">
            <Typography.Paragraph>
              在线状态每 30 秒自动保存至后端；离线时每次输入都会落入
              IndexedDB，恢复网络后静默增量同步。
            </Typography.Paragraph>
          </Card>
        </Space>
      </div>
    </div>
  );
}
