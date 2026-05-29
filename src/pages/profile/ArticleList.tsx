import { Card, Empty, List, Space, Tag, Typography } from "antd";
import { history } from "umi";
import type { HotArticle } from "@/services/api";
import styles from "./index.less";

type ArticleListProps = {
  title: string;
  description: string;
  articles: HotArticle[];
  loading: boolean;
};

export default function ArticleList({
  title,
  description,
  articles,
  loading,
}: ArticleListProps) {
  return (
    <Card className={styles.panel}>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      <List
        loading={loading}
        dataSource={articles}
        locale={{ emptyText: <Empty description="暂无内容" /> }}
        renderItem={(article) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Typography.Title
                  className={styles.articleTitle}
                  level={4}
                  onClick={() => history.push(`/article/${article.id}`)}
                >
                  {article.title}
                </Typography.Title>
              }
              description={
                <Space className={styles.articleMeta} wrap>
                  <span>{article.created_at ? new Date(article.created_at).toLocaleString() : "-"}</span>
                  <Tag color="blue">质量分 {article.quality_score}</Tag>
                  <Tag>阅读 {article.view_count}</Tag>
                  <Tag>点赞 {article.like_count}</Tag>
                  <Tag>收藏 {article.favorite_count}</Tag>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
