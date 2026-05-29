import { useEffect, useState } from "react";
import { history, useModel } from "umi";
import ArticleList from "./ArticleList";
import { fetchMyFeedbackArticles, type HotArticle } from "@/services/api";
import styles from "./index.less";

export default function MyFavoritesPage() {
  const { currentUser } = useModel("auth");
  const [articles, setArticles] = useState<HotArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      history.push("/login");
      return;
    }

    setLoading(true);
    void fetchMyFeedbackArticles("favorite")
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  return (
    <div className={styles.profilePage}>
      <ArticleList
        title="我的收藏"
        description="这里展示你收藏过的文章。"
        articles={articles}
        loading={loading}
      />
    </div>
  );
}
