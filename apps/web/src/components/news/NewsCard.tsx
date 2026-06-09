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
      <section className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        {!loading && visibleNews.length === 0 && !error ? (
          <article className="col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:col-span-3">
            No news available right now.
          </article>
        ) : (
          visibleNews.map((article, index) => (
            <a
              key={`${article.url}-${index}`}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="block min-w-0"
            >
              <Card className="mx-auto flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="aspect-[5/3] w-full overflow-hidden sm:aspect-video">
                  <img
                    alt={article.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    src={article.urlToImage || "https://placehold.co/800x450?text=News"}
                  />
                </div>

                <div className="flex flex-1 flex-col gap-2 px-3 py-3 sm:gap-2.5 sm:px-4 sm:py-4">
                  <p className="text-[10px] font-medium text-slate-500 sm:text-xs">
                    {formatPublishedDate(article.publishedAt)}
                  </p>

                  <h3 className="line-clamp-3 text-xs font-bold leading-snug text-[#0B2A4A] sm:text-sm md:line-clamp-2 md:text-base">
                    {article.title}
                  </h3>

                  <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500 sm:line-clamp-3 sm:text-sm">
                    {article.description || "No description available."}
                  </p>

                  <div className="mt-auto pt-1 sm:pt-2">
                    <span className="inline-flex w-full items-center justify-center rounded-full bg-blue-500 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.22)] transition hover:bg-blue-600 sm:py-2.5 sm:text-xs">
                      Read More
                    </span>
                  </div>
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