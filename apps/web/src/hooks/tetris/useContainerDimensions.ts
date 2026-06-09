import { useEffect, useState, type RefObject } from "react";

function readSize(node: HTMLElement) {
  const { width, height } = node.getBoundingClientRect();
  return { width, height };
}

export default function useContainerDimensions(
  ref: RefObject<HTMLElement | null>,
) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      setDimensions(readSize(node));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
}
