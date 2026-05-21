import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { getPopularNewsArticle } from "../../services/newsService";

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

export function NewsCardHorizontal() {
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

        const article = await getPopularNewsArticle();

        if (isMounted) {
          setNewsData(article ? [article] : []);
        }
      } catch (err) {
        console.error("Error loading horizontal news:", err);

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

  return (
    <section className="flex flex-col gap-4">
      {newsData.map((article, index) => (
        <a
          key={`${article.url}-${index}`}
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          <Card className="mx-auto w-[calc(100%-40px)] min-h-[280px] overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-1 md:flex-row md:min-h-[320px]">
            <div className="relative h-[240px] w-full shrink-0 overflow-hidden md:h-auto md:w-[280px]">
              <img
                alt={article.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                src={article.urlToImage || "https://placehold.co/800x450?text=News"}
              />
            </div>

            <div className="flex flex-1 flex-col gap-4 px-5 py-6">
              <Card.Header className="gap-3 p-0">
                <Card.Description className="text-sm md:text-base lg:text-lg">
                  {formatPublishedDate(article.publishedAt)}
                </Card.Description>
                <Card.Title className="line-clamp-3 text-xl md:text-3xl lg:text-3xl leading-tight">
                  {article.title}
                </Card.Title>
                <Card.Description className="line-clamp-3 text-sm md:text-base lg:text-lg">
                  {article.description || "No description available."}
                </Card.Description>
              </Card.Header>

              <Card.Footer className="mt-auto p-0">
                <span className="inline-flex h-11 items-center justify-center rounded-full bg-blue-500 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 md:text-base">
                  Read Full Article
                </span>
              </Card.Footer>
            </div>
          </Card>
        </a>
      ))}
    </section>
  );
}

export default NewsCardHorizontal;