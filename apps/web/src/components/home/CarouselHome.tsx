import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import "../../styles/home.css";

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  route: string;
  backgroundImageUrl: string;
}

const TITANS_BACKGROUND_OVERLAY =
  "linear-gradient(90deg, rgba(0, 34, 68, 0.92) 0%, rgba(0, 34, 68, 0.72) 38%, rgba(0, 34, 68, 0.28) 72%, rgba(0, 34, 68, 0.12) 100%)";

function getTitansBackground(imageUrl: string) {
  return `${TITANS_BACKGROUND_OVERLAY}, url("${imageUrl}")`;
}

const DEFAULT_SLIDES: CarouselSlide[] = [
  {
    id: "community",
    title: "Connect with the Community",
    subtitle:
      "Discover conversations, updates, and spaces to share your passion for the team with other fans.",
    buttonLabel: "Go to Community",
    route: "/community",
    backgroundImageUrl:
      "https://media.tegna-media.com/assets/WATN/images/70b28369-f377-4147-af47-a7a456107b26/70b28369-f377-4147-af47-a7a456107b26.jpg",
  },
  {
    id: "cards",
    title: "Collect cards by opening packs",
    subtitle:
      "Access the team's collection, review featured players, and enjoy a more immersive visual experience.",
    buttonLabel: "View Cards",
    route: "/team",
    backgroundImageUrl:
      "https://s.wsj.net/public/resources/images/BN-WD095_3eBz5_M_20171114135035.jpg",
  },
  {
    id: "voice-agent",
    title: "Talk to the T-Rac TitanBot",
    subtitle:
      "Start a conversational experience to get help, team information, and real-time answers.",
    buttonLabel: "Go to T-Rac TitanBot",
    route: "/voice-agent",
    backgroundImageUrl:
      "https://static.clubs.nfl.com/image/upload/f_auto/titans/sydgcqdg3y1bfi1rg1wn",
  },
];

interface CarouselHomeProps {
  slides?: CarouselSlide[];
  autoPlayInterval?: number;
}

function CarouselHome({
  slides = DEFAULT_SLIDES,
  autoPlayInterval = 5000,
}: CarouselHomeProps) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, autoPlayInterval);

    return () => window.clearInterval(intervalId);
  }, [autoPlayInterval, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const activeSlide = slides[activeIndex];

  function goToSlide(index: number) {
    setActiveIndex(index);
  }

  return (
    <section
      className="carousel-home-wrapper"
      aria-label="Carrusel principal del inicio"
      aria-roledescription="carousel"
    >
      <div className="carousel-home-hero" aria-hidden="true">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`carousel-home-bg-layer${
              index === activeIndex ? " carousel-home-bg-layer--active" : ""
            }`}
            style={{
              backgroundImage: getTitansBackground(slide.backgroundImageUrl),
            }}
          />
        ))}
      </div>

      <div className="carousel-home-inner">
        <div className="carousel-home-content-area">
          <div className="carousel-home-content">
            <h2 className="carousel-home-title">{activeSlide.title}</h2>

            <Button
              size="lg"
              onPress={() => navigate(activeSlide.route)}
              className="carousel-home-cta-button"
            >
              {activeSlide.buttonLabel}
            </Button>
          </div>
        </div>

        <div className="carousel-home-dots-row" role="tablist" aria-label="Slides">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-label={`Ir al slide ${index + 1}`}
              aria-selected={index === activeIndex}
              onClick={() => goToSlide(index)}
              className={`carousel-home-dot${
                index === activeIndex ? " carousel-home-dot-active" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CarouselHome;
