import { useEffect } from "react";
import NewsCard from "../components/news/NewsCard";
import Navbar from "../components/layout/Navbar";
import "../styles/news.css";
import NewsCardHorizontal from "../components/news/NewsCardHorizontal";
import { syncNewsArticles } from "../services/newsService";

function NewsPage() {
  useEffect(() => {
    let active = true;

    void syncNewsArticles()
      .then((result) => {
        if (!active) {
          return;
        }

        console.log("News sync completed:", result);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("News sync failed:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />

        <section className="news-section">
          <h1 className="news-title">Titans News & Updates</h1>
        </section>

        <NewsCardHorizontal />

        <section className="news-subsection">
          <h1 className="news-subtitle">Latest News</h1>
        </section>

        <NewsCard />
      </main>
    </div>
  );
}

export default NewsPage;
