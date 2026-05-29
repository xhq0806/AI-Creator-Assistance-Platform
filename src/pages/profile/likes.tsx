import { useEffect, useState } from "react";
import { history, useModel } from "umi";
import ArticleList from "./ArticleList";
import { fetchMyFeedbackArticles, type HotArticle } from "@/services/api";
import styles from "./index.less";

export default function MyLikesPage() {
  const { currentUser } = useModel("auth");
  const [articles, setArticles] = useState<HotArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      history.push("/login");
      return;
    }

    setLoading(true);
    void fetchMyFeedbackArticles("like")
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  return (
    <div className={styles.profilePage}>
      <ArticleList
        title="我的点赞"
        description="这里展示你点过赞的文章。历史计数无法反推用户，列表会从本次功能上线后的点赞开始记录。"
        articles={articles}
        loading={loading}
      />
    </div>
  );
}
