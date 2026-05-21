import UnityGameEmbed, { type UnityGameEmbedProps } from "./UnityGameEmbed";

interface UnityGameCardProps {
  unityConfig: UnityGameEmbedProps;
}

function UnityGameCard({ unityConfig }: UnityGameCardProps) {
  return (
    <section className="rounded-3xl border border-[#d8dee5] bg-white p-6 shadow-[0_24px_50px_rgba(15,39,70,0.08)]">
      <header className="mb-5">
        <p className="mb-2 text-[12px] font-extrabold tracking-[0.18em] text-[#d62839]">
          UNITY WEBGL
        </p>
        <h2 className="mb-2 text-[32px] font-bold text-[#0b2a55] max-[900px]:text-[26px]">
          Off-Season Challenge
        </h2>
        <p className="m-0 leading-[1.6] text-[#516173]">
          Embedded game with a TypeScript bridge for Joy-Con via WebHID
        </p>
      </header>

      <UnityGameEmbed {...unityConfig} />
    </section>
  );
}

export default UnityGameCard;
