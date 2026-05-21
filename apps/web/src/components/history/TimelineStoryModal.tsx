import { useEffect, useMemo, useState } from "react";
import type { TimelineEvent } from "../../types/history";

type TimelineStoryModalProps = {
  event: TimelineEvent | null;
  isOpen: boolean;
  onClose: () => void;
};

function TimelineStoryModal({
  event,
  isOpen,
  onClose,
}: TimelineStoryModalProps) {
  const imageSources = useMemo(
    () =>
      [event?.imageReferenceUrl, event?.image].filter(
        (source, index, sources): source is string =>
          Boolean(source) && sources.indexOf(source) === index,
      ),
    [event?.image, event?.imageReferenceUrl],
  );
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setImageIndex(0);
  }, [event?.id, event?.image, event?.imageReferenceUrl]);

  if (!isOpen || !event) {
    return null;
  }

  const facts = event.facts?.slice(0, 3) ?? [];
  const storyParagraphs = event.fullStory.split("\n\n").slice(0, 2);
  const currentImageSrc = imageSources[imageIndex];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(12,35,64,0.54)] p-4 backdrop-blur-[6px] md:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative grid max-h-[88vh] w-full max-w-[880px] overflow-y-auto rounded-3xl border border-[#dbe3ef] bg-white shadow-[0_28px_90px_rgba(12,35,64,0.22)] md:grid-cols-[0.8fr_1fr]"
        onClick={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <button
          aria-label="Close timeline story modal"
          className="absolute right-4 top-4 z-[2] flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e1ed] bg-white text-2xl leading-none text-[#0C2340] transition hover:bg-slate-50"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <div className="flex items-center justify-center border-b border-[#edf2f7] bg-[linear-gradient(180deg,rgba(12,35,64,0.03)_0%,rgba(75,146,219,0.08)_100%)] p-[22px] md:border-b-0 md:border-r">
          {currentImageSrc ? (
            <img
              alt={event.alt}
              className="mx-auto flex max-h-[360px] min-h-[250px] w-full items-center justify-center rounded-[18px] object-cover object-center"
              onError={() => setImageIndex((current) => current + 1)}
              src={currentImageSrc}
            />
          ) : (
            <div className="mx-auto flex max-h-[360px] min-h-[250px] w-full items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#153865_0%,#4B92DB_100%)] text-5xl font-extrabold text-white">
              {event.year}
            </div>
          )}
        </div>

        <div className="grid content-start gap-[22px] p-[30px_30px_26px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 min-w-[68px] items-center justify-center rounded-full bg-[#0C2340] px-3 text-[12px] font-extrabold tracking-[0.08em] text-white">
              {event.year}
            </span>
          </div>

          <div className="grid gap-2.5">
            <h3
              className="m-0 text-[30px] font-extrabold leading-[1.1] text-[#0C2340]"
              id={`timeline-story-title-${event.id}`}
            >
              {event.title}
            </h3>
            <p className="m-0 text-[14px] leading-[1.65] text-[#5b6777]">
              {event.description}
            </p>
          </div>

          <div className="grid gap-3.5">
            {storyParagraphs.map((paragraph) => (
              <p className="m-0 text-[14px] leading-[1.75] text-[#334155]" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>

          <div className="grid gap-2 rounded-[18px] border border-[#dce8f7] bg-[#f8fbff] p-[18px] text-[#0C2340]">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#4B92DB]">
              Historical Significance
            </span>
            <p className="m-0 text-[14px] leading-[1.65]">
              {event.significance}
            </p>
          </div>

          {facts.length > 0 ? (
            <div className="grid gap-2.5">
              <h4 className="m-0 text-[15px] font-extrabold text-[#0C2340]">
                Key Facts
              </h4>
              <ul className="m-0 grid gap-2 pl-[18px] text-[#475569]">
                {facts.map((fact) => (
                  <li className="text-[13px] leading-[1.6]" key={fact}>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default TimelineStoryModal;
