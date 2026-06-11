import { useEffect, useRef, useState } from "react";
import { Button, Card, Segmented, Spin, Tag, Typography, message } from "antd";
import { history } from "umi";
import FeedSkeleton from "@/components/FeedSkeleton";
import RichText from "@/components/RichText";
import { fetchHotArticles, type HotArticle } from "@/services/api";
import { reportWebVitals } from "@/utils/performance";
import styles from "./index.less";

const CATEGORIES = [
  { label: "全部", value: "" },
  { label: "科技", value: "科技" },
  { label: "生活", value: "生活" },
  { label: "娱乐", value: "娱乐" },
  { label: "教育", value: "教育" },
  { label: "财经", value: "财经" },
  { label: "体育", value: "体育" },
  { label: "游戏", value: "游戏" },
];

const TIME_RANGES = [
  { label: "全部", value: "" },
  { label: "今日", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
];

function createFallbackCover(title: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f172a"/><stop offset="55%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#f97316"/></linearGradient></defs>
    <rect width="1200" height="675" fill="url(#bg)"/>
    <circle cx="930" cy="120" r="260" fill="#fff" opacity=".18"/>
    <text x="80" y="330" fill="#fff" font-size="58" font-family="serif" font-weight="700">${title.slice(
      0,
      24
    )}</text>
    <text x="84" y="398" fill="#dbeafe" font-size="26" font-family="sans-serif">AI Creator Visual Cover</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function HotFeedPage() {
  const [articles, setArticles] = useState<HotArticle[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [category, setCategory] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef({ category: "", timeRange: "" });
  const errorShownRef = useRef(false);

  async function loadMore(nextCursor?: string) {
    setLoading(true);
    try {
      const result = await fetchHotArticles({
        cursor: nextCursor,
        category: filterRef.current.category || undefined,
        time_range: filterRef.current.timeRange || undefined,
      });
      if (nextCursor) {
        setArticles((current) => [...current, ...result.list]);
      } else {
        setArticles(result.list);
      }
      setCursor(result.nextCursor);
      setFinished(!result.nextCursor || result.list.length === 0);
      errorShownRef.current = false;
    } catch (error) {
      if (!errorShownRef.current) {
        messageApi.error(
          error instanceof Error ? error.message : "榜单加载失败"
        );
        errorShownRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(newCategory: string, newTimeRange: string) {
    filterRef.current = { category: newCategory, timeRange: newTimeRange };
    setCategory(newCategory);
    setTimeRange(newTimeRange);
    setCursor(undefined);
    setFinished(false);
    setLoading(true);
    void loadMore(undefined);
  }

  useEffect(() => {
    reportWebVitals();
    void loadMore(undefined);
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && !finished) {
          void loadMore(cursor);
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [cursor, loading, finished]);

  return (
    <>
      {contextHolder}
      <section className={styles.hero}>
        <Card className={styles.heroCard}>
          <Typography.Title>
            在此，每个人都是一名创作者和艺术家！
          </Typography.Title>
          <Typography.Paragraph>
            输入一个想法，AI
            会帮你扩写正文、生成配图、检查风险，并把作品送上发现页，让更多人看到你的表达。
          </Typography.Paragraph>
          <Button
            type="primary"
            size="large"
            onClick={() => history.push("/creator")}
          >
            开始尽情创作吧
          </Button>
        </Card>
        <Card className={styles.metric}>
          <Typography.Title level={4}>今日创作小助手</Typography.Title>
          <Typography.Paragraph>
            从草稿、审核到发布，全程帮你减少重复劳动。
          </Typography.Paragraph>
          <Typography.Text>
            已准备好灵感模板、配图生成和安全检查。
          </Typography.Text>
        </Card>
      </section>

      <div className={styles.filterBar}>
        <Segmented
          value={category}
          onChange={(value) => handleFilterChange(String(value), timeRange)}
          options={CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
        />
        <Segmented
          value={timeRange}
          onChange={(value) => handleFilterChange(category, String(value))}
          options={TIME_RANGES.map((t) => ({ label: t.label, value: t.value }))}
        />
      </div>

      {loading && articles.length === 0 ? (
        <FeedSkeleton />
      ) : articles.length === 0 ? (
        <Typography.Text
          type="secondary"
          style={{ display: "block", textAlign: "center", padding: 48 }}
        >
          暂无内容
        </Typography.Text>
      ) : (
        <section
          className={`${styles.feed} ${loading ? styles.feedLoading : ""}`}
        >
          {articles.map((article, index) => (
            <Card
              className={styles.articleCard}
              key={article.id}
              hoverable
              onClick={() => history.push(`/article/${article.id}`)}
            >
              {article.cover_url && (
                <img
                  className={styles.cover}
                  src={article.cover_url}
                  alt={article.title}
                  loading={index < 3 ? "eager" : "lazy"}
                  fetchPriority={index < 3 ? "high" : "auto"}
                  onError={(event) => {
                    event.currentTarget.src = createFallbackCover(
                      article.title
                    );
                  }}
                />
              )}
              <Typography.Title level={4}>{article.title}</Typography.Title>
              <Typography.Paragraph type="secondary">
                {article.author?.username || "匿名创作者"} ·{" "}
                {article.created_at
                  ? new Date(article.created_at).toLocaleDateString()
                  : "-"}
                {article.category ? ` · ${article.category}` : null}
              </Typography.Paragraph>
              <RichText className={styles.excerpt} content={article.content} />
              <Tag color="blue">质量分 {article.quality_score}</Tag>
              {article.ai_rank_score !== undefined ? (
                <Tag color="geekblue">
                  AI 推荐 {Math.round(article.ai_rank_score)}
                </Tag>
              ) : null}
              <Tag color="purple">热度 {article.score.toFixed(2)}</Tag>
              <Tag>阅读 {article.view_count}</Tag>
              {article.ai_rank_reason ? (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                  推荐理由：{article.ai_rank_reason}
                </Typography.Paragraph>
              ) : null}
            </Card>
          ))}
        </section>
      )}
      <div ref={sentinelRef} className={styles.sentinel}>
        {loading && articles.length > 0 ? (
          <div className={styles.sentinelLoading}>
            <Spin />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              加载中...
            </Typography.Text>
          </div>
        ) : finished ? (
          "没有更多内容了"
        ) : null}
      </div>
    </>
  );
}
