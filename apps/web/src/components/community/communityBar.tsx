import { Icon } from "@iconify/react";
import { Button } from "@heroui/react";

interface CommunityBarProps {
  onCreatePost: () => void;
  activeFilter: "hot" | "new";
  setActiveFilter: (filter: "hot" | "new") => void;
}

const CommunityBar = (props: CommunityBarProps) => {
  const { onCreatePost, activeFilter, setActiveFilter } = props;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 max-lg:flex-col lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("hot")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeFilter === "hot"
              ? "border-b-2 border-red-500 bg-red-50 text-red-500"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Icon icon="mdi:fire" width={18} />
          Hot
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("new")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeFilter === "new"
              ? "border-b-2 border-blue-500 bg-blue-50 text-blue-500"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Icon icon="mdi:star-circle-outline" width={18} />
          New
        </button>
      </div>

      <Button
        onClick={onCreatePost}
        className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0B2A55] px-6 py-2 font-bold text-white transition-colors hover:bg-[#1D4E89] lg:w-auto"
      >
        <Icon icon="mdi:plus" width={20} />
        Create Post
      </Button>
    </div>
  );
};

export default CommunityBar;
