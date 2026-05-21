import { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
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
  "linear-gradient(90deg, rgba(0, 34, 68) 0%, rgba(0, 34, 68, 0.7) 45%, rgba(0, 34, 68, 0.22) 100%)";

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
    title: "Explore Your Cards",
    subtitle:
      "Access the team's collection, review featured players, and enjoy a more immersive visual experience.",
    buttonLabel: "View Cards",
    route: "/team",
    backgroundImageUrl:
       "https://s.wsj.net/public/resources/images/BN-WD095_3eBz5_M_20171114135035.jpg",
  },
  {
    id: "voice-agent",
    title: "Talk to the Voice Agent",
    subtitle:
      "Start a conversational experience to get help, team information, and real-time answers.",
    buttonLabel: "Open Agent",
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

  function showPreviousSlide() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? slides.length - 1 : currentIndex - 1,
    );
  }

  function showNextSlide() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
  }

  return (
    <section
      className="carousel-home-wrapper"
      aria-label="Carrusel principal del inicio"
    >
      <Card
        className="carousel-home-card"
        style={{
          background: getTitansBackground(activeSlide.backgroundImageUrl),
        }}
      >
        <Card.Content className="carousel-home-card-body">
          <div className="carousel-home-middle-row">
            <button
              type="button"
              aria-label="Slide anterior"
              onClick={showPreviousSlide}
              className="carousel-home-arrow-button"
            >
              {"<"}
            </button>

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

            <button
              type="button"
              aria-label="Siguiente slide"
              onClick={showNextSlide}
              className="carousel-home-arrow-button"
            >
              {">"}
            </button>
          </div>
        </Card.Content>
      </Card>
    </section>
  );
}

export default CarouselHome;