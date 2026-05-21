export function getObjectPosition(cardImagePositionClass?: string): string | undefined {
  if (!cardImagePositionClass) {
    return undefined;
  }

  const match = cardImagePositionClass.match(/object-\[(.+)\]/);

  if (!match) {
    return undefined;
  }

  return match[1].replace(/_/g, " ");
}

export function getYoutubeThumbnailUrl(youtubeUrl?: string): string | null {
  if (!youtubeUrl) {
    return null;
  }

  try {
    const url = new URL(youtubeUrl);

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.replace("/", "");
      return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
    }

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
    }
  } catch {
    return null;
  }

  return null;
}
