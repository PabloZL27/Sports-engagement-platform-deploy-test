import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { getNewsArticles } from "../../services/newsService";

function formatPublishedDate(value = "") {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function NewsCard() {
  const [showAllNews, setShowAllNews] = useState(false);
  const [newsData, setNewsData] = useState([
    {
      url: "",
      title: "",
      urlToImage: "",
      description: "",
      publishedAt: ""
    },
  ]);
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
          setNewsData(articles);
        }
      } catch (err) {
        console.error("Error loading news:", err);

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
    return <p className="text-sm text-muted">Loading news...</p>;
  }

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (newsData.length === 0) {
    return <p className="text-sm text-muted">No news available right now.</p>;
  }

  const visibleNews = showAllNews ? newsData : newsData.slice(0, 6);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!loading && visibleNews.length === 0 && !error ? (
          <article className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:col-span-2 xl:col-span-3">
            No news available right now.
          </article>
        ) : (
          visibleNews.map((article, index) => (
            <a
              key={`${article.url}-${index}`}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <Card className="h-full w-[calc(100%-30px)] mx-auto overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-1">
                <img
                  alt={article.title}
                  className="block h-56 w-full rounded-t-2xl object-cover"
                  loading="lazy"
                  src={article.urlToImage || "https://placehold.co/800x450?text=News"}
                />

                <div className="flex h-full flex-col gap-3 px-4 py-4">
                  <Card.Header className="gap-2 p-0">
                    <Card.Description className="line-clamp-3">
                      {formatPublishedDate(article.publishedAt)}
                    </Card.Description>
                    <Card.Title className="line-clamp-2">{article.title}</Card.Title>
                    <Card.Description className="line-clamp-3">
                      {article.description || "No description available."}
                    </Card.Description>
                  </Card.Header>

                  <Card.Footer className="p-0">
                    <span className="inline-flex items-center gap-1 cursor-pointer text-blue-500 hover:underline">
                      Read More
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                      </svg>
                    </span>
                  </Card.Footer>
                </div>
              </Card>
            </a>
          ))
        )}
      </section>

      {newsData.length > 6 ? (
        <div className="mt-7 flex justify-center">
          <button
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#d8e1ed] bg-[#f8fbff] px-6 text-[14px] font-bold text-[#0C2340] shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#0C2340] hover:bg-white hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
            type="button"
            onClick={() => setShowAllNews((current) => !current)}
          >
            {showAllNews ? "Show Less News" : "View More News"}
          </button>
        </div>
      ) : null}
    </>
  );
}

export default NewsCard;