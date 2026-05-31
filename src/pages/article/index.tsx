import { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Image, List, Popconfirm, Space, Spin, Tag, Typography, message } from 'antd';
import { history, useModel, useParams } from 'umi';
import RichText from '@/components/RichText';
import {
  fetchArticle,
  fetchArticleVersions,
  restoreArticleVersion,
  sendArticleFeedback,
  withdrawArticle,
  type ArticleVersion,
  type HotArticle,
} from '@/services/api';
import styles from './index.less';

function createFallbackCover(title: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f172a"/><stop offset="55%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#f97316"/></linearGradient></defs>
    <rect width="1200" height="675" fill="url(#bg)"/>
    <circle cx="930" cy="120" r="260" fill="#fff" opacity=".18"/>
    <text x="80" y="330" fill="#fff" font-size="58" font-family="serif" font-weight="700">${title.slice(0, 24)}</text>
    <text x="84" y="398" fill="#dbeafe" font-size="26" font-family="sans-serif">AI Creator Visual Cover</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type ArticleDetail = HotArticle & {
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'withdrawn';
  media_urls?: string[];
};

export default function ArticlePage() {
  const params = useParams();
  const { currentUser } = useModel('auth');
  const [article, setArticle] = useState<ArticleDetail>();
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    async function loadArticle() {
      try {
        const data = await fetchArticle(Number(params.id));
        setArticle(data);
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : '文章加载失败');
      } finally {
        setLoading(false);
      }
    }

    void loadArticle();
  }, [params.id]);

  useEffect(() => {
    async function loadVersions() {
      if (!article || currentUser?.id !== article.user_id) {
        setVersions([]);
        return;
      }

      try {
        const data = await fetchArticleVersions(article.id);
        setVersions(data);
      } catch (error) {
        messageApi.warning(error instanceof Error ? error.message : '版本记录加载失败');
      }
    }

    void loadVersions();
  }, [article?.id, currentUser?.id]);

  if (loading) {
    return <Spin />;
  }

  if (!article) {
    return <Card>文章不存在</Card>;
  }

  const currentArticle = article;
  const canEdit = currentUser?.id === currentArticle.user_id;

  async function handleFeedback(type: 'like' | 'favorite' | 'negative') {
    if (!currentUser) {
      messageApi.warning('请先登录后再反馈');
      history.push('/login');
      return;
    }

    try {
      const updated = await sendArticleFeedback(currentArticle.id, type);
      setArticle(updated);
      const successMessage =
        type === 'like' ? '点赞成功' : type === 'favorite' ? '收藏成功' : '已收到反馈';
      messageApi.success(successMessage);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '反馈失败');
    }
  }

  async function handleWithdraw() {
    try {
      const updated = await withdrawArticle(currentArticle.id);
      setArticle(updated);
      const data = await fetchArticleVersions(currentArticle.id);
      setVersions(data);
      messageApi.success('文章已撤回并从热榜移除');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '撤回失败');
    }
  }

  async function handleRestore(versionId: number) {
    try {
      const restored = await restoreArticleVersion(currentArticle.id, versionId);
      setArticle(restored);
      const data = await fetchArticleVersions(currentArticle.id);
      setVersions(data);
      messageApi.success('已回滚为草稿，可进入工作台继续编辑后发布');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '回滚失败');
    }
  }

  return (
    <div className={styles.detail}>
      {contextHolder}
      <Card className={styles.article}>
        {article.cover_url && (
          <div className={styles.coverWrap}>
            <Image
              className={styles.cover}
              src={article.cover_url}
              alt={article.title}
              preview={false}
              fallback={createFallbackCover(article.title)}
            />
          </div>
        )}
        <Typography.Title>{article.title}</Typography.Title>
        <Typography.Paragraph type="secondary">
          作者：{article.author?.username || '匿名创作者'} · 发布时间：
          {article.created_at ? new Date(article.created_at).toLocaleString() : '-'}
        </Typography.Paragraph>
        <RichText className={styles.content} content={article.content} />
        <Space wrap>
          <Button onClick={() => handleFeedback('like')}>点赞 {article.like_count}</Button>
          <Button onClick={() => handleFeedback('favorite')}>收藏 {article.favorite_count}</Button>
          <Button onClick={() => handleFeedback('negative')}>不感兴趣 {article.negative_count}</Button>
        </Space>
      </Card>
      <Card className={styles.metaCard} title="内容数据">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="状态">
            <Tag color={article.status === 'published' ? 'green' : 'orange'}>{article.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="质量分">{article.quality_score}</Descriptions.Item>
          <Descriptions.Item label="AI 推荐分">{article.ai_rank_score ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="阅读量">{article.view_count}</Descriptions.Item>
          <Descriptions.Item label="正向反馈">{article.like_count + article.favorite_count}</Descriptions.Item>
          <Descriptions.Item label="负反馈">{article.negative_count}</Descriptions.Item>
          <Descriptions.Item label="热度">{article.score?.toFixed ? article.score.toFixed(2) : '-'}</Descriptions.Item>
        </Descriptions>
        <div className={styles.rankInsight}>
          <Typography.Text className={styles.rankLabel}>AI 推荐理由：</Typography.Text>
          <Typography.Paragraph className={styles.rankReason}>
            {article.ai_rank_reason || '-'}
          </Typography.Paragraph>
          <Typography.Text className={styles.rankLabel}>主题标签：</Typography.Text>
          {article.ai_rank_tags?.length ? (
            <div className={styles.tagWrap}>
              {article.ai_rank_tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : (
            <Typography.Text>-</Typography.Text>
          )}
        </div>
        {canEdit && (
          <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
            <Button type="primary" block onClick={() => history.push(`/creator/${article.id}`)}>
              二次编辑
            </Button>
            {article.status === 'published' ? (
              <Popconfirm title="撤回后文章将从热榜移除，确定继续？" onConfirm={handleWithdraw}>
                <Button block danger>
                  撤回文章
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        )}
      </Card>
      {canEdit ? (
        <Card className={styles.metaCard} title="版本记录">
          <List
            size="small"
            dataSource={versions}
            locale={{ emptyText: '暂无版本记录' }}
            renderItem={(version) => (
              <List.Item
                actions={[
                  <Popconfirm key="restore" title={`回滚到版本 ${version.version_no}？`} onConfirm={() => handleRestore(version.id)}>
                    <Button size="small">回滚</Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={`v${version.version_no} · ${version.source}`}
                  description={`${version.created_at ? new Date(version.created_at).toLocaleString() : '-'} · ${version.title}`}
                />
              </List.Item>
            )}
          />
        </Card>
      ) : null}
    </div>
  );
}
