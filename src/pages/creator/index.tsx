import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
  List,
} from "antd";
import {
  BarChartOutlined,
  HistoryOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { history, useLocation, useModel, useParams } from "umi";
import {
  auditContent,
  createMaterial,
  createPromptTemplate,
  createPromptTeam,
  deleteMaterial,
  deletePromptTemplate,
  evaluateQuality,
  fetchArticle,
  fetchLatestDraft,
  fetchMaterials,
  fetchPromptTemplates,
  saveDraft,
  saveTemplateWithVersion,
  markPromptTemplateUsed,
  syncDistribution,
  type ArticleDraft,
  type AuditResult,
  type MaterialItem,
  type PromptTemplate,
  type PromptTeam,
  type GenerationRecord,
  fetchGenerationHistory,
  deleteGenerationHistory,
} from "@/services/api";
import {
  createLocalDraftId,
  getLatestLocalDraft,
} from "@/utils/offlineDraft";

// Hooks
import { useAutoSave } from "./hooks/useAutoSave";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { useAI } from "./hooks/useAI";

// Sub-components
import RichContentEditor from "./components/RichContentEditor";
import PromptManager from "./components/PromptManager";
import MaterialManager from "./components/MaterialManager";
import AuditPanel from "./components/AuditPanel";
import QualityPanel from "./components/QualityPanel";
import PreviewModal from "./components/PreviewModal";
import ImageRefineModal from "./components/ImageRefineModal";

import styles from "./index.less";

type CreatorForm = ArticleDraft & { prompt: string };

type QualityResult = {
  quality_score: number;
  structure: number;
  depth: number;
  fluency: number;
  reason: string;
};

export default function CreatorPage() {
  const params = useParams();
  const location = useLocation();
  const { currentUser, isLoggedIn } = useModel("auth");
  const [form] = Form.useForm<CreatorForm>();

  // ── Core state ──────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult>();
  const [qualityResult, setQualityResult] = useState<QualityResult>();
  const [articleId, setArticleId] = useState<number>();
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [articleCategory, setArticleCategory] = useState("");

  // ── Prompt template state ──────────────────────────────
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [promptName, setPromptName] = useState("");
  const [promptCategory, setPromptCategory] = useState("通用");
  const [sharingVisibility, setSharingVisibility] = useState<"private" | "team_public">("private");

  // ── Material state ──────────────────────────────────────
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  // ── Team state ──────────────────────────────────────────
  const [promptTeamModalOpen, setPromptTeamModalOpen] = useState(false);
  const [myTeams, setMyTeams] = useState<PromptTeam[]>([]);
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  // ── Generation history ──────────────────────────────────
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [generationHistoryOpen, setGenerationHistoryOpen] = useState(false);

  // ── Preview ─────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Image refine ─────────────────────────────────────────
  const [refineImageUrl, setRefineImageUrl] = useState<string>("");
  const [refineModalOpen, setRefineModalOpen] = useState(false);

  // ── Refs ────────────────────────────────────────────────
  const localDraftId = useRef(createLocalDraftId());
  const publishingRef = useRef(false);
  const publishAbortRef = useRef<AbortController | null>(null);

  // ── Hooks ───────────────────────────────────────────────
  const { online } = useOfflineSync(currentUser?.id);

  const { saveDraft: doSave, saveAndReset } = useAutoSave({
    online, articleId, currentUserId: currentUser?.id,
    mediaUrls, articleCategory, localDraftId, publishingRef, form,
    setArticleId,
  });

  const {
    generating, generatingImage, generatingVideo,
    generateMode, setGenerateMode,
    setActiveHistoryId,
    handleGenerate, handleStopGenerate,
    handleGenerateImage, handleStopGenerateImage,
    handleGenerateVideo, handleStopGenerateVideo,
  } = useAI({ form, mediaUrls, setMediaUrls });

  const loadedStatus = useMemo<ArticleDraft["status"]>(() => "draft", []);
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

  // ── Auth guard ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      history.push("/login");
    }
  }, [isLoggedIn]);

  // ── Hydrate editor ──────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    void hydrateEditor();
    void hydrateWorkspaceResources();
  }, [isLoggedIn, currentUser?.id, params.id, shouldRestoreLatestDraft]);

  function resetEditor() {
    form.resetFields();
    setArticleId(undefined);
    setAuditResult(undefined);
    setQualityResult(undefined);
    setMediaUrls([]);
    setArticleCategory("");
    setActiveHistoryId(undefined);
    localDraftId.current = createLocalDraftId();
  }

  async function hydrateWorkspaceResources() {
    try {
      const [promptList, materialList] = await Promise.all([
        fetchPromptTemplates(),
        fetchMaterials(),
      ]);
      setPromptTemplates(promptList);
      setMaterials(materialList);
    } catch (error: any) {
      message.warning(error instanceof Error ? `资源加载失败：${error.message}` : "资源加载失败");
    }
  }

  async function hydrateEditor() {
    if (!currentUser) return;
    resetEditor();

    try {
      if (params.id) {
        const article = await fetchArticle(Number(params.id));
        setArticleId(article.id);
        setMediaUrls(article.media_urls || []);
        setArticleCategory(article.category || "通用");
        form.setFieldsValue({
          title: article.title,
          content: article.content,
          category: article.category || "通用",
          media_urls: article.media_urls || [],
        });
        return;
      }

      if (!shouldRestoreLatestDraft) return;

      const localDraft = await getLatestLocalDraft(currentUser.id);
      if (!online && localDraft) {
        setArticleId(localDraft.id);
        setMediaUrls(localDraft.media_urls || []);
        setArticleCategory(localDraft.category || "通用");
        form.setFieldsValue(localDraft);
        message.info("已恢复本地离线草稿");
        return;
      }

      const cloudDraft = online ? await fetchLatestDraft() : null;
      const draft = cloudDraft || localDraft;
      if (draft) {
        setArticleId(draft.id);
        setMediaUrls(draft.media_urls || []);
        setArticleCategory(draft.category || "通用");
        form.setFieldsValue(draft);
        message.success(cloudDraft ? "已恢复上次云端草稿" : "已恢复本地草稿");
      }
    } catch (error: any) {
      message.warning(error instanceof Error ? `草稿恢复失败：${error.message}` : "草稿恢复失败");
    }
  }

  // ── Save / Publish ──────────────────────────────────────
  async function handleSaveDraft() {
    setSaving(true);
    await saveAndReset();
    setSaving(false);
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
      message[result.is_compliant ? "success" : "warning"](result.reason);
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "审核失败");
    } finally {
      setAuditing(false);
    }
  }

  async function handleQualityScore() {
    const values = form.getFieldsValue();
    if (!values.title?.trim() || !values.content?.trim()) {
      message.warning("请先完善标题和正文");
      return;
    }
    setScoring(true);
    try {
      const result = await evaluateQuality({ title: values.title, content: values.content });
      setQualityResult(result);
      message.success(`质量评分 ${Math.round(result.quality_score)} 分`);
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "质量评分失败");
    } finally {
      setScoring(false);
    }
  }

  function applySafeAlternative() {
    if (!auditResult?.safe_alternative) {
      message.info("当前没有可应用的合规替代文本");
      return;
    }
    form.setFieldValue("content", auditResult.safe_alternative);
    message.success("已应用合规替代内容");
  }

  async function handlePublish() {
    if (publishingRef.current) {
      publishAbortRef.current?.abort();
      message.info("已取消本次发布");
      return;
    }

    if (!articleCategory) {
      form.validateFields(["category"]).catch(() => {});
      return;
    }

    const values = form.getFieldsValue();
    if (!values.title?.trim() || !values.content?.trim()) {
      message.warning("请先完善标题和正文");
      return;
    }

    const controller = new AbortController();
    publishAbortRef.current = controller;
    publishingRef.current = true;
    setPublishing(true);
    setSaving(true);
    try {
      message.loading({ content: "正在审核、评分并发布...", key: "publish", duration: 0 });
      const saved = await saveDraft(
        {
          id: articleId,
          title: values.title,
          content: values.content,
          media_urls: mediaUrls,
          category: articleCategory,
          status: "published",
          auto_fix: true,
        },
        controller.signal
      );
      setArticleId(saved.id);
      message.success({
        content: saved.auto_fixed ? "内容已自动改写为合规版本并发布" : "内容已通过审核并发布",
        key: "publish",
      });
      resetEditor();
      history.push(`/article/${saved.id}`);
    } catch (error: any) {
      if (error instanceof DOMException && error.name === "AbortError") {
        message.destroy("publish");
        return;
      }
      message.destroy("publish");
      message.error(error instanceof Error ? error.message : "发布失败");
    } finally {
      publishAbortRef.current = null;
      publishingRef.current = false;
      setPublishing(false);
      setSaving(false);
    }
  }

  async function handleDistribution() {
    const targetId = articleId || (await doSave(false));
    if (!targetId) {
      message.warning("请先保存草稿后再分发");
      return;
    }
    const result = await syncDistribution({ article_id: targetId, platforms: ["toutiao", "douyin"] });
    message.success(`模拟分发完成：${result.sync_status}`);
  }

  // ── Prompt template handlers ────────────────────────────
  async function savePromptTemplate() {
    const content = String(form.getFieldValue("prompt") || "").trim();
    if (!promptName.trim() || !content) {
      message.warning("请输入模板名称和提示词内容");
      return;
    }
    try {
      const prompt = await saveTemplateWithVersion({
        name: promptName.trim(),
        category: promptCategory,
        content,
        visibility: sharingVisibility,
        team_id: null,
      });
      setPromptTemplates((c) => [prompt, ...c]);
      setPromptName("");
      message.success(`模板已保存（${sharingVisibility === "team_public" ? "团队共享" : "私有"}）`);
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "模板保存失败");
    }
  }

  async function applyPromptTemplate(t: PromptTemplate) {
    form.setFieldValue("prompt", t.content);
    try {
      await markPromptTemplateUsed(t.id);
    } catch { /* ignore */ }
  }

  async function removePromptTemplate(t: PromptTemplate) {
    try {
      await deletePromptTemplate(t.id);
      setPromptTemplates((c) => c.filter((p) => p.id !== t.id));
      message.success("模板已删除");
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  // ── Material handlers ───────────────────────────────────
  async function handleDeleteMaterial(item: MaterialItem) {
    try {
      await deleteMaterial(item.id);
      setMaterials((c) => c.filter((m) => m.id !== item.id));
      setMediaUrls((c) => c.filter((url) => url !== item.url));
      message.success("素材已删除");
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  // ── Team handlers ───────────────────────────────────────
  async function loadMyTeams() {
    try {
      const { listMyPromptTeams } = await import("@/services/api");
      const teams = await listMyPromptTeams();
      setMyTeams(teams);
    } catch { /* ignore */ }
  }

  async function handleCreateTeam() {
    if (!teamName.trim()) {
      message.warning("请输入团队名称");
      return;
    }
    setCreatingTeam(true);
    try {
      await createPromptTeam({ name: teamName.trim() });
      message.success("团队已创建");
      setTeamName("");
      loadMyTeams();
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "创建团队失败");
    } finally {
      setCreatingTeam(false);
    }
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className={styles.workspace}>
      <div className={styles.contentGrid}>
        {/* ============ 主编辑区 ============ */}
        <Card className={styles.editorCard}>
          <div className={styles.status}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              灵感创作工作台{" "}
              {loadedStatus === "published" ? <Tag color="blue">二次编辑</Tag> : null}
            </Typography.Title>
            {connectivityTag}
          </div>

          <div className={styles.toolbar}>
            <Select
              value={generateMode}
              onChange={setGenerateMode}
              style={{ minWidth: 110 }}
              disabled={generating}
            >
              <Select.Option value="full_generation">全文生成</Select.Option>
              <Select.Option value="structured">结构化图文</Select.Option>
              <Select.Option value="rewrite">智能改写</Select.Option>
              <Select.Option value="outline">大纲生成</Select.Option>
            </Select>
            <Button
              type="primary"
              icon={generating ? <LoadingOutlined /> : <ThunderboltOutlined />}
              onClick={generating ? handleStopGenerate : handleGenerate}
              disabled={publishing}
            >
              {generating ? "停止生成" : "AI 生成"}
            </Button>
            <Button
              icon={generatingImage ? <LoadingOutlined /> : <PictureOutlined />}
              onClick={generatingImage ? handleStopGenerateImage : handleGenerateImage}
              disabled={publishing}
            >
              {generatingImage ? "停止生成" : "生成配图"}
            </Button>
            <Button
              icon={generatingVideo ? <LoadingOutlined /> : <VideoCameraOutlined />}
              onClick={generatingVideo ? handleStopGenerateVideo : handleGenerateVideo}
              disabled={publishing}
            >
              {generatingVideo ? "停止生成" : "生成视频"}
            </Button>
            <Button
              icon={<SafetyCertificateOutlined />}
              loading={auditing}
              onClick={handleAudit}
              disabled={publishing}
            >
              安全审核
            </Button>
            <Button
              icon={<BarChartOutlined />}
              loading={scoring}
              onClick={handleQualityScore}
              disabled={publishing}
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
            <Button type="primary" ghost={!publishing} danger={publishing} onClick={handlePublish}>
              {publishing ? "停止发布" : "审核并发布"}
            </Button>
            <Button onClick={handleDistribution} disabled={publishing}>模拟分发</Button>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => {
                fetchGenerationHistory().then(setGenerationHistory).catch(() => {});
                setGenerationHistoryOpen(true);
              }}
            >
              生成历史
            </Button>
            <Button onClick={() => setPreviewOpen(true)} disabled={publishing}>预览</Button>
          </div>

          <Form<CreatorForm>
            form={form}
            layout="vertical"
            onValuesChange={() => !online && void doSave(false)}
          >
            <Form.Item name="prompt" label="创作提示词">
              <Input.TextArea rows={3} placeholder="写一篇关于未来科技趋势的短图文" />
            </Form.Item>
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: "请输入标题" }]}
            >
              <Input placeholder="输入图文标题" />
            </Form.Item>
            <Form.Item
              name="category"
              label="文章分类"
              rules={[{ required: true, message: "请选择文章分类" }]}
            >
              <Select
                value={articleCategory || undefined}
                onChange={(v) => { setArticleCategory(v); form.setFieldsValue({ category: v }); }}
                style={{ width: 160 }}
                placeholder="请选择文章分类"
              >
                {["通用", "科技", "生活", "娱乐", "教育", "财经", "体育", "游戏"].map((c) => (
                  <Select.Option key={c} value={c}>{c}</Select.Option>
                ))}
              </Select>
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

        {/* ============ 侧边面板 ============ */}
        <Space direction="vertical" size={16}>
          {/* 提示词管理 */}
          <PromptManager
            prompts={promptTemplates}
            promptName={promptName}
            setPromptName={setPromptName}
            promptCategory={promptCategory}
            setPromptCategory={setPromptCategory}
            sharingVisibility={sharingVisibility}
            setSharingVisibility={setSharingVisibility}
            onSaveAsTemplate={savePromptTemplate}
            onApplyTemplate={applyPromptTemplate}
            onDeleteTemplate={removePromptTemplate}
            onOpenTeamModal={() => { setPromptTeamModalOpen(true); loadMyTeams(); }}
          />

          {/* 团队管理 Modal */}
          <Modal
            title="团队管理"
            open={promptTeamModalOpen}
            onCancel={() => setPromptTeamModalOpen(false)}
            footer={null}
          >
            <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>
              我的团队
            </Typography.Text>
            {myTeams.length === 0 ? (
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                暂无团队，创建一个新团队开始协作
              </Typography.Text>
            ) : (
              <List
                dataSource={myTeams}
                size="small"
                style={{ marginBottom: 16 }}
                renderItem={(team) => (
                  <List.Item>
                    <List.Item.Meta title={team.name} description={`创建于 ${team.created_at}`} />
                  </List.Item>
                )}
              />
            )}
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="新团队名称"
              />
              <Button type="primary" onClick={handleCreateTeam} loading={creatingTeam}>
                创建团队
              </Button>
            </Space.Compact>
          </Modal>

          {/* 生成历史 Modal */}
          <Modal
            title="生成历史记录"
            open={generationHistoryOpen}
            onCancel={() => setGenerationHistoryOpen(false)}
            footer={null}
            width={640}
          >
            {generationHistory.length === 0 ? (
              <Typography.Text type="secondary">暂无生成历史记录</Typography.Text>
            ) : (
              <List
                dataSource={generationHistory}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="apply"
                        size="small"
                        type="primary"
                        onClick={() => {
                          const { title, content, media_urls } = item.result;
                          if (title || content) {
                            form.setFieldsValue({
                              title: title || "",
                              content: content || "",
                              ...(item.prompt ? { prompt: item.prompt } : {}),
                            });
                          }
                          setMediaUrls(media_urls || []);
                          setArticleId(undefined);
                          setActiveHistoryId(Number(item.id));
                          message.success("已恢复该次生成结果");
                          setGenerationHistoryOpen(false);
                        }}
                      >
                        应用
                      </Button>,
                      <Button
                        key="del"
                        size="small"
                        danger
                        onClick={async () => {
                          await deleteGenerationHistory(item.id);
                          setGenerationHistory((prev) => prev.filter((r) => r.id !== item.id));
                          message.success("已删除");
                        }}
                      >
                        删除
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color={
                            item.mode === "image" ? "purple"
                              : item.mode === "video" ? "volcano"
                              : "blue"
                          }>
                            {item.mode === "structured" ? "结构化图文"
                              : item.mode === "full_generation" ? "全文生成"
                              : item.mode === "rewrite" ? "改写"
                              : item.mode === "image" ? "配图生成"
                              : item.mode === "video" ? "视频生成"
                              : "大纲"}
                          </Tag>
                          <Typography.Text strong>
                            {item.result.title || item.prompt || "(无标题)"}
                          </Typography.Text>
                        </Space>
                      }
                      description={
                        <Space>
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                          {(item.result.media_urls?.length ?? 0) > 0 && (
                            <span>· 素材 {item.result.media_urls!.length} 个</span>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Modal>

          {/* 素材管理 */}
          <MaterialManager
            materials={materials}
            mediaUrls={mediaUrls}
            setMediaUrls={setMediaUrls}
            onDeleteMaterial={handleDeleteMaterial}
            onRefineImage={(url) => {
              setRefineImageUrl(url);
              setRefineModalOpen(true);
            }}
          />

          {/* 审核面板 */}
          <AuditPanel auditResult={auditResult} onApplySafeAlternative={applySafeAlternative} />

          {/* 质量评估面板 */}
          <QualityPanel qualityResult={qualityResult} />

          {/* 离线保护 */}
          <Card className={styles.sideCard} title="离线保护">
            <Typography.Paragraph>
              在线时每 30 秒自动保存至云端；离线时内容暂存本地，
              网络恢复后自动同步，无需担心意外丢失。
            </Typography.Paragraph>
          </Card>
        </Space>
      </div>

      {/* 预览 Modal */}
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} form={form} mediaUrls={mediaUrls} />
      <ImageRefineModal
        open={refineModalOpen}
        imageUrl={refineImageUrl}
        onClose={() => setRefineModalOpen(false)}
        onRefined={(newUrl) => {
          setMediaUrls((current) => current.map((u) => (u === refineImageUrl ? newUrl : u)));
          setRefineModalOpen(false);
        }}
      />
    </div>
  );
}
