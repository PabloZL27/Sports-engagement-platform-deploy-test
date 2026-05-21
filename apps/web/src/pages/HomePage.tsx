import { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import CarouselHome from "../components/home/CarouselHome";
import MatchesCard from "../components/home/MatchesCard";
import NewsHome from "../components/home/NewsHome";
import ClassicMatchCard from "../components/history/ClassicMatchCard";
import { FaFire, FaNewspaper, FaTrophy } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { getClassicMatches } from "../services/historyService";
import type { ClassicMatch } from "../types/history";
import "../styles/home.css";
import { Auth } from "../context/AuthContext";
import { getProducts } from "../services/storeService";
import { enrichProductsWithTags } from "../data/mockProducts";
import type { StoreProduct } from "../types";
import ProductPreviewCard from "../components/store/ProductPreviewCard";
import CommunitySection from "../components/community/communityHome";

function HomePage() {
  const [classicMatches, setClassicMatches] = useState<ClassicMatch[]>([]);
  const [classicMatchesLoading, setClassicMatchesLoading] = useState(true);
  const [classicMatchesError, setClassicMatchesError] = useState("");
  const { role } = Auth();
  const navigate = useNavigate();

  const [bestSellers, setBestSellers] = useState<StoreProduct[]>([]);
  const [bestSellersLoading, setBestSellersLoading] = useState(true);

  useEffect(() => {
    if (role === "admin") {
      navigate("/admin");
    }
  }, [role, navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadBestSellers() {
      try {
        setBestSellersLoading(true);
        const { products } = await getProducts();
        const enriched = enrichProductsWithTags(products);

        if (isMounted) {
          setBestSellers(enriched.slice(0, 4));
        }
      } catch (error) {
        console.error("Error loading best sellers:", error);
      } finally {
        if (isMounted) {
          setBestSellersLoading(false);
        }
      }
    }

    void loadBestSellers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadClassicMatches() {
      try {
        setClassicMatchesLoading(true);
        setClassicMatchesError("");
        const matches = await getClassicMatches();
        if (isMounted) {
          setClassicMatches(matches.slice(0, 4));
        }
      } catch (error) {
        console.error("Error loading classic matches:", error);
        if (isMounted) {
          setClassicMatchesError("Something went wrong while loading highlights.");
        }
      } finally {
        if (isMounted) {
          setClassicMatchesLoading(false);
        }
      }
    }

    void loadClassicMatches();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page">
      <main className="home-container">
        <Navbar />

        <CarouselHome />

        <MatchesCard />

        <section className="home-section">
          <div className="home-section-header">
            <div className="home-section-heading">
              <FaNewspaper className="home-section-icon" aria-hidden="true" />
              <h1 className="home-title">Trending News</h1>
            </div>
            <Link to="/news" className="home-section-link">
              View more →<span aria-hidden="true"></span>
            </Link>
          </div>
        </section>
        <NewsHome />
        <CommunitySection />
        <section className="home-section">
          <div className="home-section-header">
            <div className="home-section-heading">
              <FaTrophy className="home-section-icon" aria-hidden="true" />
              <h1 className="home-title">Top Highlights</h1>
            </div>
            <Link to="/history" className="home-section-link">
              View more →<span aria-hidden="true"></span>
            </Link>
          </div>
        </section>
        <section className="home-section">
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            {classicMatchesLoading ? (
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                Loading highlights...
              </article>
            ) : null}

            {!classicMatchesLoading &&
            classicMatches.length === 0 &&
            !classicMatchesError ? (
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                No classic matches available.
              </article>
            ) : null}

            {classicMatchesError ? (
              <article className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                {classicMatchesError}
              </article>
            ) : null}

            {classicMatches.map((match) => (
              <ClassicMatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <div className="home-section-heading">
              <FaFire className="home-section-icon" aria-hidden="true" />
              <h1 className="home-title">Best Sellers</h1>
            </div>
            <Link to="/store" className="home-section-link">
              View more →<span aria-hidden="true"></span>
            </Link>
          </div>

          <div className="mt-8 lg:mt-10">
            {bestSellersLoading ? (
              <div className="py-12 text-center text-slate-600">
                Loading products...
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                {bestSellers.map((product) => (
                  <ProductPreviewCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;