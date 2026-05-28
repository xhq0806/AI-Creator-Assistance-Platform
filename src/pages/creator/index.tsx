import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Divider, Form, Input, Space, Tag, Typography, message } from 'antd';
import { ThunderboltOutlined, SafetyCertificateOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useModel, useParams } from 'umi';
import {
  auditContent,
  fetchArticle,
  fetchLatestDraft,
  generateContent,
  generateImage,
  saveDraft,
  syncDistribution,
  syncOfflineDrafts,
  type ArticleDraft,
  type AuditResult,
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

const promptTemplates = [
  '将素材改写成一篇适合今日头条的信息增量型短图文，要求标题有冲突感，正文分 3 段。',
  '围绕核心素材生成一篇种草内容，突出真实体验、适用人群和行动建议。',
  '把以下观点扩展成长文大纲，包含开头钩子、关键论点、案例和结尾互动。',
];

type CreatorForm = ArticleDraft & {
  prompt: string;
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
  const [auditResult, setAuditResult] = useState<AuditResult>();
  const [articleId, setArticleId] = useState<number>();
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState('');
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
    await Promise.all(dirtyDrafts.map((draft) => markDraftSynced(draft.localId, draft.id)));
    messageApi.success(`已静默同步 ${result.synced} 份离线草稿`);
  }

  function resetEditor() {
    form.resetFields();
    setArticleId(undefined);
    setAuditResult(undefined);
    setMediaUrls([]);
    setMaterialInput('');
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

  function addMaterial() {
    const url = materialInput.trim();
    const validUrl = /^https?:\/\/.+/i.test(url);
    const validType = /\.(png|jpg|jpeg|gif|webp|mp4|mov|mp3|wav)(\?.*)?$/i.test(url);

    if (!validUrl || !validType || url.length > 500) {
      messageApi.warning('素材需为合法 URL，且文件类型应为图片、视频或音频');
      return;
    }

    setMediaUrls((current) => Array.from(new Set([...current, url])));
    setMaterialInput('');
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
            <Space className={styles.promptList} direction="vertical" size={8}>
              {promptTemplates.map((template) => (
                <Button className={styles.promptButton} key={template} block title={template} onClick={() => form.setFieldValue('prompt', template)}>
                  <span>{template}</span>
                </Button>
              ))}
            </Space>
          </Card>
          <Card className={styles.sideCard} title="素材管理与合规校验">
            <Space.Compact style={{ width: '100%' }}>
              <Input value={materialInput} onChange={(event) => setMaterialInput(event.target.value)} placeholder="https://.../image.webp" />
              <Button onClick={addMaterial}>添加</Button>
            </Space.Compact>
            <Divider />
            <Space direction="vertical" size={8}>
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
