import { useEffect, useMemo, useState } from "react";
import type { TimelineEvent } from "../../types/history";
import { useScrollReveal } from "./useScrollReveal";

type TimelineItemProps = {
  event: TimelineEvent;
  index: number;
  onOpenStory: (event: TimelineEvent) => void;
};

function TimelineItem({ event, index, onOpenStory }: TimelineItemProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  const imageSources = useMemo(
    () =>
      [event.imageReferenceUrl, event.image].filter(
        (source, sourceIndex, sources): source is string =>
          Boolean(source) && sources.indexOf(source) === sourceIndex,
      ),
    [event.image, event.imageReferenceUrl],
  );

  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [event.id, event.image, event.imageReferenceUrl]);

  const currentImageSrc = imageSources[imageIndex];
  const isLeft = index % 2 === 0;

  function handleOpenStory() {
    onOpenStory(event);
  }

  function handleKeyDown(keyboardEvent: React.KeyboardEvent<HTMLElement>) {
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      handleOpenStory();
    }
  }

  const animationClass = isVisible
    ? "translate-y-0 opacity-100"
    : "translate-y-5 opacity-0";

  const imageCardClass =
    "group w-full max-w-[430px] cursor-pointer overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B92DB] focus-visible:ring-offset-2";

  const textCardClass =
    "group w-full max-w-[430px] cursor-pointer overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B92DB] focus-visible:ring-offset-2";

  const imageCard = (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open full story for ${event.title}`}
      onClick={handleOpenStory}
      onKeyDown={handleKeyDown}
      className={imageCardClass}
    >
      {currentImageSrc ? (
        <div className="h-[250px] overflow-hidden bg-[#e9eef4] lg:h-[270px]">
          <img
            src={currentImageSrc}
            alt={event.alt}
            onError={() => setImageIndex((current) => current + 1)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="flex h-[250px] items-center justify-center bg-[linear-gradient(135deg,#002244_0%,#4B92DB_100%)] text-[32px] font-extrabold tracking-[0.10em] text-white lg:h-[270px]">
          {event.year}
        </div>
      )}
    </article>
  );

  const textCard = (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open full story for ${event.title}`}
      onClick={handleOpenStory}
      onKeyDown={handleKeyDown}
      className={textCardClass}
    >
      <div className="flex h-[250px] flex-col justify-between p-6 lg:h-[270px]">
        <div className="space-y-4">
          <span className="inline-flex items-center rounded-full bg-[#eef4fb] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.10em] text-[#4B92DB]">
            Titans Legacy
          </span>

          <div className="space-y-3">
            <h3 className="text-[24px] font-extrabold leading-[1.06] text-[#002244] lg:text-[27px]">
              {event.title}
            </h3>
            <p className="line-clamp-5 text-[15px] leading-[1.75] text-slate-600">
              {event.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(mouseEvent) => {
            mouseEvent.stopPropagation();
            handleOpenStory();
          }}
          className="inline-flex items-center gap-2 border-none bg-transparent p-0 text-[15px] font-bold text-[#4B92DB]"
        >
          {event.linkLabel}
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 12 12"
          >
            <path d="M2.5 6h7m-3-3 3 3-3 3" />
          </svg>
        </button>
      </div>
    </article>
  );

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-500 ease-out ${animationClass}`}
      style={{ transitionDelay: `${Math.min(index * 45, 160)}ms` }}
    >
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 md:hidden">
        <div className="relative flex justify-center">
          <div
            className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#002244] text-center text-[11px] font-extrabold tracking-[0.08em] text-white shadow-[0_10px_22px_rgba(0,34,68,0.24)] ring-4 ring-[#f8fbff] transition-all duration-500 ${
              isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            {event.year}
          </div>
        </div>

        <article
          role="button"
          tabIndex={0}
          aria-label={`Open full story for ${event.title}`}
          onClick={handleOpenStory}
          onKeyDown={handleKeyDown}
          className="group w-full max-w-[540px] cursor-pointer overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B92DB] focus-visible:ring-offset-2"
        >
          <div className={`grid min-h-[220px] ${currentImageSrc ? "grid-cols-[44%_56%]" : "grid-cols-1"}`}>
            {currentImageSrc ? (
              <div className="overflow-hidden bg-[#e9eef4]">
                <img
                  src={currentImageSrc}
                  alt={event.alt}
                  onError={() => setImageIndex((current) => current + 1)}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              </div>
            ) : null}

            <div className="flex flex-col justify-between space-y-4 p-5">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full bg-[#eef4fb] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.10em] text-[#4B92DB]">
                  Titans Legacy
                </span>

                <div className="space-y-2">
                  <h3 className="text-[21px] font-extrabold leading-[1.08] text-[#002244]">
                    {event.title}
                  </h3>
                  <p className="line-clamp-4 text-[14px] leading-[1.7] text-slate-600">
                    {event.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(mouseEvent) => {
                  mouseEvent.stopPropagation();
                  handleOpenStory();
                }}
                className="inline-flex items-center gap-2 border-none bg-transparent p-0 text-[14px] font-bold text-[#4B92DB]"
              >
                {event.linkLabel}
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 12 12"
                >
                  <path d="M2.5 6h7m-3-3 3 3-3 3" />
                </svg>
              </button>
            </div>
          </div>
        </article>
      </div>

      <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)] md:items-center">
        <div className="flex justify-end pr-8 lg:pr-12">
          {isLeft ? imageCard : textCard}
        </div>

        <div className="relative flex items-center justify-center">
          <div
            className={`relative z-10 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#002244] text-center text-[14px] font-extrabold tracking-[0.10em] text-white shadow-[0_14px_30px_rgba(0,34,68,0.28)] ring-8 ring-[#f8fbff] transition-all duration-500 ${
              isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            {event.year}
          </div>
        </div>

        <div className="flex justify-start pl-8 lg:pl-12">
          {isLeft ? textCard : imageCard}
        </div>
      </div>
    </div>
  );
}

export default TimelineItem;
