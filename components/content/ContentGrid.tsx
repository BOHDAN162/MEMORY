import ContentCard from "@/components/content/ContentCard";
import type { NormalizedContentItem } from "@/components/content/content-hub";
import type { ContentType } from "@/lib/server/content/types";

type ContentGridProps = {
  items: NormalizedContentItem[];
  activeType: ContentType | "all";
  debugEnabled?: boolean;
};

const typeTitles: Record<ContentType, string> = {
  video: "Видео",
  book: "Книги",
  article: "Статьи",
  channel: "Каналы",
  prompt: "Промпты",
};

const typeOrder: ContentType[] = ["video", "book", "article", "channel", "prompt"];

const ContentGrid = ({ items, activeType, debugEnabled = false }: ContentGridProps) => {
  if (activeType !== "all") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ContentCard key={`${item.provider}:${item.id}`} item={item} debug={debugEnabled} />
        ))}
      </div>
    );
  }

  const grouped = items.reduce<Record<ContentType, NormalizedContentItem[]>>((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<ContentType, NormalizedContentItem[]>);

  return (
    <div className="space-y-8">
      {typeOrder
        .filter((type) => grouped[type]?.length)
        .map((type) => (
          <section key={type} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-primary">Раздел</p>
                <h3 className="text-xl font-semibold">{typeTitles[type]}</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[type].map((item) => (
                <ContentCard key={`${item.provider}:${item.id}`} item={item} debug={debugEnabled} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
};

export default ContentGrid;
