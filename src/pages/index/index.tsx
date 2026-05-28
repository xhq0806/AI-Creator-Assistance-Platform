import { useEffect, useRef, useState } from 'react';
import { Button, Card, Tag, Typography, message } from 'antd';
import { history } from 'umi';
import FeedSkeleton from '@/components/FeedSkeleton';
import RichText from '@/components/RichText';
import { fetchHotArticles, type HotArticle } from '@/services/api';
import { reportLcpMetric } from '@/utils/performance';
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

export default function HotFeedPage() {
  const [articles, setArticles] = useState<HotArticle[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function loadMore(nextCursor = cursor) {
    if (loading || finished) {
      return;
    }

    setLoading(true);
    try {
      const result = await fetchHotArticles(nextCursor);
      setArticles((current) => [...current, ...result.list]);
      setCursor(result.nextCursor);
      setFinished(!result.nextCursor || result.list.length === 0);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '榜单加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reportLcpMetric();
    void loadMore(undefined);
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [cursor, loading, finished]);

  return (
    <>
      {contextHolder}
      <section className={styles.hero}>
        <Card className={styles.heroCard}>
          <Typography.Title>在此，每个人都是一名创作者和艺术家！</Typography.Title>
          <Typography.Paragraph>
            输入一个想法，AI 会帮你扩写正文、生成配图、检查风险，并把作品送上发现页，让更多人看到你的表达。
          </Typography.Paragraph>
          <Button type="primary" size="large" onClick={() => history.push('/creator')}>
            开始尽情创作吧
          </Button>
        </Card>
        <Card className={styles.metric}>
          <Typography.Title level={4}>今日创作小助手</Typography.Title>
          <Typography.Paragraph>从草稿、审核到发布，全程帮你减少重复劳动。</Typography.Paragraph>
          <Typography.Text>已准备好灵感模板、配图生成和安全检查。</Typography.Text>
        </Card>
      </section>

      {articles.length === 0 && loading ? (
        <FeedSkeleton />
      ) : (
        <section className={styles.feed}>
          {articles.map((article, index) => (
            <Card className={styles.articleCard} key={article.id} hoverable onClick={() => history.push(`/article/${article.id}`)}>
              {article.cover_url && (
                <img
                  className={styles.cover}
                  src={article.cover_url}
                  alt={article.title}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  fetchPriority={index < 3 ? 'high' : 'auto'}
                  onError={(event) => {
                    event.currentTarget.src = createFallbackCover(article.title);
                  }}
                />
              )}
              <Typography.Title level={4}>{article.title}</Typography.Title>
              <Typography.Paragraph type="secondary">
                {article.author?.username || '匿名创作者'} · {article.created_at ? new Date(article.created_at).toLocaleDateString() : '-'}
              </Typography.Paragraph>
              <RichText className={styles.excerpt} content={article.content} />
              <Tag color="blue">质量分 {article.quality_score}</Tag>
              <Tag color="purple">热度 {article.score.toFixed(2)}</Tag>
              <Tag>阅读 {article.view_count}</Tag>
            </Card>
          ))}
        </section>
      )}
      <div ref={sentinelRef} className={styles.sentinel}>
        {loading && articles.length > 0 ? <FeedSkeleton /> : finished ? '没有更多内容了' : null}
      </div>
    </>
  );
}
