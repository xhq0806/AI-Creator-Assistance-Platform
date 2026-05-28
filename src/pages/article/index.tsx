import { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Image, Spin, Tag, Typography, message } from 'antd';
import { history, useModel, useParams } from 'umi';
import RichText from '@/components/RichText';
import { fetchArticle, type HotArticle } from '@/services/api';
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
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  media_urls?: string[];
};

export default function ArticlePage() {
  const params = useParams();
  const { currentUser } = useModel('auth');
  const [article, setArticle] = useState<ArticleDetail>();
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

  if (loading) {
    return <Spin />;
  }

  if (!article) {
    return <Card>文章不存在</Card>;
  }

  const canEdit = currentUser?.id === article.user_id;

  return (
    <div className={styles.detail}>
      {contextHolder}
      <Card className={styles.article}>
        {article.cover_url && (
          <Image
            className={styles.cover}
            src={article.cover_url}
            alt={article.title}
            preview={false}
            fallback={createFallbackCover(article.title)}
          />
        )}
        <Typography.Title>{article.title}</Typography.Title>
        <Typography.Paragraph type="secondary">
          作者：{article.author?.username || '匿名创作者'} · 发布时间：
          {article.created_at ? new Date(article.created_at).toLocaleString() : '-'}
        </Typography.Paragraph>
        <RichText className={styles.content} content={article.content} />
      </Card>
      <Card className={styles.metaCard} title="内容数据">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="状态">
            <Tag color={article.status === 'published' ? 'green' : 'orange'}>{article.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="质量分">{article.quality_score}</Descriptions.Item>
          <Descriptions.Item label="阅读量">{article.view_count}</Descriptions.Item>
          <Descriptions.Item label="热度">{article.score?.toFixed ? article.score.toFixed(2) : '-'}</Descriptions.Item>
        </Descriptions>
        {canEdit && (
          <Button type="primary" block style={{ marginTop: 16 }} onClick={() => history.push(`/creator/${article.id}`)}>
            二次编辑
          </Button>
        )}
      </Card>
    </div>
  );
}
