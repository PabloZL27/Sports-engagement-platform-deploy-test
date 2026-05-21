import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { getNewsArticles, type NewsArticle } from "../../services/newsService";
import "../../styles/home.css";

function NewsHome() {
  const [newsData, setNewsData] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      try {
        setLoading(true);
        setError("");

        const articles = await getNewsArticles();

        if (isMounted) {
          setNewsData(articles.slice(0, 4));
        }
      } catch (err) {
        console.error("Error loading home news:", err);

        if (isMounted) {
          setError("Could not load news.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadNews();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p className="home-message">Loading news...</p>;
  }

  if (error) {
    return <p className="home-error">{error}</p>;
  }

  if (newsData.length === 0) {
    return <p className="home-message">No news available right now.</p>;
  }

  return (
    <section className="news-home-grid" aria-label="Titans news preview">
      {newsData.map((article, index) => (
        <a
          key={`${article.url}-${index}`}
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="news-home-link"
        >
          <Card className="news-home-card">
            <img
              alt={article.title}
              className="news-home-image"
              loading="lazy"
              src={article.urlToImage || "https://placehold.co/800x450?text=News"}
            />
            <div className="news-home-overlay" />

            <Card.Content className="news-home-content">
              <div className="news-home-copy">
                <Card.Title className="news-home-title">
                  {article.title || article.description}
                </Card.Title>
                <Card.Description className="news-home-description">
                {article.description || "No description available."}
                </Card.Description>
              </div>
            </Card.Content>
          </Card>
        </a>
      ))}
    </section>
  );
}

export default NewsHome;
