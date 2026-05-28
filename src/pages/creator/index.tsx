import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Divider, Form, Input, Space, Tag, Typography, message } from 'antd';
import { ThunderboltOutlined, SafetyCertificateOutlined, SaveOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import { history, useLocation, useModel, useParams } from 'umi';
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
  markPromptTemplateUsed,
  saveDraft,
  syncDistribution,
  syncOfflineDrafts,
  type ArticleDraft,
  type AuditResult,
  type MaterialItem,
  type PromptTemplate,
} from '@/services/api';
import {
  createLocalDraftId,
  getLatestLocalDraft,
  listDirtyDrafts,
  markDraftSynced,
  persistOfflineDraft,
} from '@/utils/offlineDraft';
import styles from './index.less';

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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(value: string) {
  return value
    .split(/\n/)
    .map((line) => {
      const html = escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return html ? `<p>${html}</p>` : '<p><br /></p>';
    })
    .join('');
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const children = Array.from(node.childNodes).map(nodeToMarkdown).join('');
  const tagName = node.tagName.toLowerCase();

  if (tagName === 'strong' || tagName === 'b') {
    return `**${children}**`;
  }
  if (tagName === 'br') {
    return '\n';
  }
  if (tagName === 'p' || tagName === 'div') {
    return `${children}\n`;
  }

  return children;
}

function RichContentEditor({ value = '', onChange, placeholder }: RichContentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) {
      return;
    }

    editor.innerHTML = value ? markdownToHtml(value) : '';
  }, [value]);

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const markdown = Array.from(event.currentTarget.childNodes).map(nodeToMarkdown).join('').trim();
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

export default function CreatorPage() {
  const params = useParams();
  const location = useLocation();
  const { currentUser, isLoggedIn } = useModel('auth');
  const [form] = Form.useForm<CreatorForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult>();
  const [qualityResult, setQualityResult] = useState<QualityResult>();
  const [articleId, setArticleId] = useState<number>();
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [promptName, setPromptName] = useState('');
  const [promptCategory, setPromptCategory] = useState('通用');
  const [loadedStatus, setLoadedStatus] = useState<ArticleDraft['status']>('draft');
  const localDraftId = useRef(createLocalDraftId());

  const connectivityTag = useMemo(
    () => (online ? <Tag color="green">在线自动同步</Tag> : <Tag color="orange">离线 IndexedDB 保存</Tag>),
    [online],
  );
  const shouldRestoreLatestDraft = useMemo(() => {
    return new URLSearchParams(location.search).get('restore') === 'latest';
  }, [location.search]);

  useEffect(() => {
    if (!isLoggedIn) {
      resetEditor();
      history.push('/login');
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

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
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
        .map((item) => markDraftSynced(item.localId as string, item.serverId)),
    );
    messageApi.success(`已静默同步 ${result.synced} 份离线草稿`);
  }

  async function hydrateWorkspaceResources() {
    try {
      const [promptList, materialList] = await Promise.all([fetchPromptTemplates(), fetchMaterials()]);
      setPromptTemplates(promptList);
      setMaterials(materialList);
    } catch (error) {
      messageApi.warning(error instanceof Error ? `工作台资源加载失败：${error.message}` : '工作台资源加载失败');
    }
  }

  function resetEditor() {
    form.resetFields();
    setArticleId(undefined);
    setAuditResult(undefined);
    setQualityResult(undefined);
    setMediaUrls([]);
    setMaterialInput('');
    setMaterialName('');
    setLoadedStatus('draft');
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
        messageApi.info('已恢复本地离线草稿');
        return;
      }

      const cloudDraft = online ? await fetchLatestDraft() : null;
      const draft = cloudDraft || localDraft;
      if (draft) {
        setArticleId(draft.id);
        setMediaUrls(draft.media_urls || []);
        form.setFieldsValue(draft);
        messageApi.success(cloudDraft ? '已恢复上次云端草稿' : '已恢复本地草稿');
      }
    } catch (error) {
      messageApi.warning(error instanceof Error ? `草稿恢复失败：${error.message}` : '草稿恢复失败');
    }
  }

  async function handleSaveDraft(showToast = true): Promise<number | undefined> {
    if (!currentUser) {
      return undefined;
    }

    const values = form.getFieldsValue();
    const rawTitle = values.title?.trim() || '';
    const rawContent = values.content?.trim() || '';
    const hasMeaningfulDraft = Boolean(rawContent || (rawTitle && rawTitle !== '未命名草稿') || mediaUrls.length);

    if (!hasMeaningfulDraft) {
      if (showToast) {
        messageApi.info('当前没有可保存的草稿内容');
      }
      return undefined;
    }

    const draft: ArticleDraft = {
      id: articleId,
      title: rawTitle || '未命名草稿',
      content: values.content || '',
      media_urls: mediaUrls,
      status: 'draft',
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
          messageApi.info('已保存到本地 IndexedDB，网络恢复后自动同步');
        }
        return undefined;
      }

      const savedDraft = await saveDraft(draft);
      setArticleId(savedDraft.id);
      if (showToast) {
        messageApi.success('草稿已保存');
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
      messageApi.warning(error instanceof Error ? `后端保存失败，已转存本地：${error.message}` : '已转存本地');
      return undefined;
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    const prompt = form.getFieldValue('prompt');
    if (!prompt) {
      messageApi.warning('请输入创作提示词');
      return;
    }

    setGenerating(true);
    try {
      const generated = await generateContent({
        prompt,
        mode: 'full_generation',
        materials: mediaUrls,
      });
      form.setFieldsValue(generated);
      messageApi.success('AI 内容已生成');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'AI 生成失败');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateImage() {
    const values = form.getFieldsValue();
    const prompt = values.prompt || values.title || values.content;
    if (!prompt) {
      messageApi.warning('请先输入创作提示词、标题或正文');
      return;
    }

    setGeneratingImage(true);
    try {
      const result = await generateImage({
        prompt,
        title: values.title,
        content: values.content,
        materials: mediaUrls,
      });
      setMediaUrls((current) => Array.from(new Set([...result.media_urls, ...current])));
      messageApi.success('AI 配图已生成并加入素材列表');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'AI 配图生成失败');
    } finally {
      setGeneratingImage(false);
    }
  }

  function applySafeAlternative() {
    if (!auditResult?.safe_alternative) {
      messageApi.info('当前没有可应用的合规替代文本');
      return;
    }

    form.setFieldValue('content', auditResult.safe_alternative);
    messageApi.success('已应用合规替代内容');
  }

  async function savePromptTemplate() {
    const content = String(form.getFieldValue('prompt') || '').trim();
    const name = promptName.trim();
    if (!name || !content) {
      messageApi.warning('请填写模板名称，并在创作提示词中准备模板内容');
      return;
    }

    try {
      const prompt = await createPromptTemplate({
        name,
        category: promptCategory || '通用',
        content,
      });
      setPromptTemplates((current) => [prompt, ...current]);
      setPromptName('');
      messageApi.success('Prompt 模板已保存');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Prompt 模板保存失败');
    }
  }

  async function applyPromptTemplate(template: PromptTemplate) {
    form.setFieldValue('prompt', template.content);
    try {
      const updated = await markPromptTemplateUsed(template.id);
      setPromptTemplates((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      // 使用计数失败不阻塞创作。
    }
  }

  async function removePromptTemplate(template: PromptTemplate) {
    try {
      await deletePromptTemplate(template.id);
      setPromptTemplates((current) => current.filter((item) => item.id !== template.id));
      messageApi.success('Prompt 模板已删除');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Prompt 模板删除失败');
    }
  }

  async function addMaterial() {
    const url = materialInput.trim();
    if (!url) {
      messageApi.warning('请输入素材 URL');
      return;
    }

    try {
      const material = await createMaterial({
        name: materialName.trim() || '未命名素材',
        url,
      });
      setMaterials((current) => [material, ...current]);
      setMediaUrls((current) => Array.from(new Set([...current, material.url])));
      setMaterialName('');
      setMaterialInput('');
      messageApi.success('素材已通过基础校验并加入素材库');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '素材添加失败');
    }
  }

  async function removeMaterial(item: MaterialItem) {
    try {
      await deleteMaterial(item.id);
      setMaterials((current) => current.filter((material) => material.id !== item.id));
      setMediaUrls((current) => current.filter((url) => url !== item.url));
      messageApi.success('素材已删除');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '素材删除失败');
    }
  }

  async function handleAudit() {
    const values = form.getFieldsValue();
    setAuditing(true);
    try {
      const result = await auditContent({ title: values.title || '', content: values.content || '' });
      setAuditResult(result);
      messageApi[result.is_compliant ? 'success' : 'warning'](result.reason);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '审核失败');
    } finally {
      setAuditing(false);
    }
  }

  async function handleQualityScore() {
    const values = form.getFieldsValue();
    if (!values.title?.trim() || !values.content?.trim()) {
      messageApi.warning('请先完善标题和正文');
      return;
    }

    setScoring(true);
    try {
      const result = await evaluateQuality({ title: values.title, content: values.content });
      setQualityResult(result);
      messageApi.success(`质量评分 ${Math.round(result.quality_score)} 分`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '质量评分失败');
    } finally {
      setScoring(false);
    }
  }

  async function handleDistribution() {
    const targetArticleId = articleId || (await handleSaveDraft(false));

    if (!targetArticleId) {
      messageApi.warning('请先保存草稿后再分发');
      return;
    }

    const result = await syncDistribution({ article_id: targetArticleId, platforms: ['toutiao', 'douyin'] });
    messageApi.success(`模拟分发完成：${result.sync_status}`);
  }

  async function handlePublish() {
    const values = form.getFieldsValue();
    const title = values.title || '';
    const content = values.content || '';
    if (!title.trim() || !content.trim()) {
      messageApi.warning('请先完善标题和正文');
      return;
    }

    setSaving(true);
    try {
      const savedArticle = await saveDraft({
        id: articleId,
        title,
        content,
        media_urls: mediaUrls,
        status: 'published',
      });
      setArticleId(savedArticle.id);
      setLoadedStatus('published');
      messageApi.success('内容已通过审核并发布');
      resetEditor();
      history.push(`/article/${savedArticle.id}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '发布失败');
    } finally {
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
              AI 内容创作工作台 {loadedStatus === 'published' ? <Tag color="blue">二次编辑</Tag> : null}
            </Typography.Title>
            {connectivityTag}
          </div>
          <div className={styles.toolbar}>
            <Button type="primary" icon={<ThunderboltOutlined />} loading={generating} onClick={handleGenerate}>
              AI 生成
            </Button>
            <Button loading={generatingImage} onClick={handleGenerateImage}>
              生成配图
            </Button>
            <Button icon={<SafetyCertificateOutlined />} loading={auditing} onClick={handleAudit}>
              安全审核
            </Button>
            <Button icon={<BarChartOutlined />} loading={scoring} onClick={handleQualityScore}>
              质量评分
            </Button>
            <Button icon={<SaveOutlined />} loading={saving} onClick={() => handleSaveDraft()}>
              保存草稿
            </Button>
            <Button type="primary" ghost loading={saving} onClick={handlePublish}>
              审核并发布
            </Button>
            <Button onClick={handleDistribution}>模拟分发</Button>
          </div>
          <Form<CreatorForm> form={form} layout="vertical" onValuesChange={() => !online && void handleSaveDraft(false)}>
            <Form.Item name="prompt" label="创作提示词">
              <Input.TextArea rows={3} placeholder="写一篇关于未来科技趋势的短图文" />
            </Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="输入图文标题" />
            </Form.Item>
            <Form.Item name="content" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
              <RichContentEditor placeholder="开始创作..." />
            </Form.Item>
          </Form>
        </Card>

        <Space direction="vertical" size={16}>
          <Card className={styles.sideCard} title="Prompt 管理">
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Input value={promptName} onChange={(event) => setPromptName(event.target.value)} placeholder="模板名称" />
              <Input value={promptCategory} onChange={(event) => setPromptCategory(event.target.value)} placeholder="分类" />
            </Space.Compact>
            <Button block style={{ marginBottom: 12 }} onClick={savePromptTemplate}>
              保存当前提示词为模板
            </Button>
            <Space className={styles.promptList} direction="vertical" size={8}>
              {promptTemplates.map((template) => (
                <Space.Compact key={template.id} style={{ width: '100%' }}>
                  <Button className={styles.promptButton} block title={template.content} onClick={() => applyPromptTemplate(template)}>
                    <span>
                      [{template.category}] {template.name}
                    </span>
                  </Button>
                  {template.user_id ? (
                    <Button icon={<DeleteOutlined />} onClick={() => removePromptTemplate(template)} />
                  ) : null}
                </Space.Compact>
              ))}
            </Space>
          </Card>
          <Card className={styles.sideCard} title="素材管理与合规校验">
            <Input
              style={{ marginBottom: 8 }}
              value={materialName}
              onChange={(event) => setMaterialName(event.target.value)}
              placeholder="素材名称"
            />
            <Space.Compact style={{ width: '100%' }}>
              <Input value={materialInput} onChange={(event) => setMaterialInput(event.target.value)} placeholder="https://.../image.webp" />
              <Button onClick={addMaterial}>添加</Button>
            </Space.Compact>
            <Divider />
            <Space direction="vertical" size={8}>
              {materials.map((item) => (
                <Space key={item.id} direction="vertical" size={4} style={{ width: '100%' }}>
                  {item.media_type === 'image' ? <img className={styles.materialPreview} src={item.url} alt={item.name} /> : null}
                  <Space.Compact style={{ width: '100%' }}>
                    <Button block title={item.risk_reason} onClick={() => setMediaUrls((current) => Array.from(new Set([...current, item.url])))}>
                      {item.name}
                    </Button>
                    <Button icon={<DeleteOutlined />} onClick={() => removeMaterial(item)} />
                  </Space.Compact>
                </Space>
              ))}
              {mediaUrls.length ? (
                mediaUrls.map((url) => (
                  <Space key={url} direction="vertical" size={4} style={{ width: '100%' }}>
                    {url.startsWith('data:image/') || /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url) ? (
                      <img className={styles.materialPreview} src={url} alt="AI 生成配图" />
                    ) : null}
                    <Tag closable onClose={() => setMediaUrls((current) => current.filter((item) => item !== url))}>
                      {url.length > 36 ? `${url.slice(0, 36)}...` : url}
                    </Tag>
                  </Space>
                ))
              ) : (
                <Typography.Text type="secondary">可添加图片、视频、音频 URL，AI 生成时会作为素材上下文。</Typography.Text>
              )}
            </Space>
          </Card>
          <Card className={styles.sideCard} title="审核免疫系统">
            {auditResult ? (
              <Alert
                className={styles.auditResult}
                type={auditResult.is_compliant ? 'success' : 'warning'}
                message={auditResult.is_compliant ? '内容合规' : `风险等级：${auditResult.risk_level}`}
                description={
                  <Space direction="vertical">
                    <span>{auditResult.reason}</span>
                    <span>置信度：{Math.round(auditResult.accuracy * 100)}%</span>
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
              <Typography.Paragraph type="secondary">
                审核会从涉黄、涉赌、涉毒、敏感信息四个维度返回结构化 JSON 结果。
              </Typography.Paragraph>
            )}
          </Card>
          <Card className={styles.sideCard} title="质量评估">
            {qualityResult ? (
              <Space direction="vertical" size={8}>
                <Tag color="blue">综合 {Math.round(qualityResult.quality_score)}</Tag>
                <Tag>结构 {Math.round(qualityResult.structure)}</Tag>
                <Tag>深度 {Math.round(qualityResult.depth)}</Tag>
                <Tag>流畅 {Math.round(qualityResult.fluency)}</Tag>
                <Typography.Paragraph type="secondary">{qualityResult.reason}</Typography.Paragraph>
              </Space>
            ) : (
              <Typography.Paragraph type="secondary">发布时会自动评分，也可以在编辑过程中手动查看结构、深度、流畅度等子分。</Typography.Paragraph>
            )}
          </Card>
          <Card className={styles.sideCard} title="离线策略">
            <Typography.Paragraph>
              在线状态每 30 秒自动保存至后端；离线时每次输入都会落入 IndexedDB，恢复网络后静默增量同步。
            </Typography.Paragraph>
          </Card>
        </Space>
      </div>
    </div>
  );
}
