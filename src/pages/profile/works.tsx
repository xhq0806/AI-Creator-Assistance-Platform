import { useEffect, useState } from "react";
import { history, useModel } from "umi";
import ArticleList from "./ArticleList";
import { fetchMyArticles, type HotArticle } from "@/services/api";
import styles from "./index.less";

export default function MyWorksPage() {
  const { currentUser } = useModel("auth");
  const [articles, setArticles] = useState<HotArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      history.push("/login");
      return;
    }

    setLoading(true);
    void fetchMyArticles()
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  return (
    <div className={styles.profilePage}>
      <ArticleList
        title="个人作品"
        description="这里展示你创建过的草稿、已发布、撤回和驳回内容。"
        articles={articles}
        loading={loading}
      />
    </div>
  );
}
