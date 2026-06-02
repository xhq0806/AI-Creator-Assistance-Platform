import { useEffect, useState } from "react";
import { Card, Tag, Typography, message } from "antd";
import { history, useLocation } from "umi";
import RichText from "@/components/RichText";
import FeedSkeleton from "@/components/FeedSkeleton";
import { searchArticles, type HotArticle } from "@/services/api";

export default function SearchPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const query = params.get("q") || "";
  const [articles, setArticles] = useState<HotArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    searchArticles(query)
      .then(setArticles)
      .catch((error) => {
        messageApi.error(error instanceof Error ? error.message : "搜索失败");
      })
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
      {contextHolder}
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        搜索结果：{query}
      </Typography.Title>
      {loading ? (
        <FeedSkeleton />
      ) : articles.length === 0 ? (
        <Typography.Text type="secondary">未找到相关文章</Typography.Text>
      ) : (
        articles.map((article) => (
          <Card
            key={article.id}
            hoverable
            style={{ marginBottom: 16 }}
            onClick={() => history.push(`/article/${article.id}`)}
          >
            <Typography.Title level={4}>{article.title}</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
              {article.author?.username || "匿名"} ·{" "}
              {article.created_at
                ? new Date(article.created_at).toLocaleDateString()
                : "-"}
              {article.category ? ` · ${article.category}` : null}
            </Typography.Paragraph>
            <RichText
              className="searchExcerpt"
              content={
                article.content.length > 300
                  ? article.content.slice(0, 300) + "..."
                  : article.content
              }
            />
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">质量分 {article.quality_score}</Tag>
              <Tag>阅读 {article.view_count}</Tag>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
