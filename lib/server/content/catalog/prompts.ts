export type PromptContext = {
  mode: "selected" | "all";
  interests: { id: string; title: string; cluster?: string | null }[];
  primaryInterest?: { id: string; title: string; cluster?: string | null } | null;
};

export type PromptTemplate = {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  clusters?: string[];
  interestTitles?: string[];
  build: (ctx: PromptContext) => string;
};

const normalize = (value: string | null | undefined) => value?.trim() ?? "";

const formatInterestList = (ctx: PromptContext): string => {
  const titles = ctx.interests.map((interest) => normalize(interest.title)).filter(Boolean);
  if (titles.length === 0) return "моим интересам";
  if (titles.length === 1) return `теме “${titles[0]}”`;
  if (titles.length === 2) return `темам “${titles[0]}” и “${titles[1]}”`;
  return `темам: ${titles.slice(0, 3).join(", ")}${titles.length > 3 ? " и другим" : ""}`;
};

const describeMode = (ctx: PromptContext): string =>
  ctx.mode === "selected"
    ? "Работай только с выбранной темой, не уходи в сторону."
    : "Учитывай все перечисленные интересы и показывай общий баланс.";

const primaryTitle = (ctx: PromptContext): string =>
  normalize(ctx.primaryInterest?.title) || "выбранной теме";

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "prompt:learn:path",
    title: "Сделай план изучения",
    description: "4-недельный маршрут с целями, теория+практика и контрольные точки.",
    tags: ["learning", "structure"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Ты методолог обучения. Составь 4-недельный маршрут по теме “${topic}”.`,
        describeMode(ctx),
        "Каждую неделю дай цель, 3–5 шагов и критерий проверки. Добавь 2–3 мини-практики на неделю.",
        "Покажи план в виде списка по неделям, коротко и по делу.",
      ].join(" ");
    },
  },
  {
    id: "prompt:summary:distill",
    title: "Выжми конспект",
    description: "Структурированный конспект и опорные тезисы.",
    tags: ["summary", "notes"],
    build: (ctx) => {
      const scope = formatInterestList(ctx);
      return [
        `Выступай как редактор. Сожми текст по ${scope} в конспект до 10 пунктов.`,
        "Структура: вывод в 2 предложениях, ключевые тезисы, примеры/цифры, что можно применить сразу.",
        describeMode(ctx),
        "Форматируй маркерами, без воды.",
      ].join(" ");
    },
  },
  {
    id: "prompt:quiz:self-check",
    title: "Проверь понимание",
    description: "Квиз с разбором ответов и подсказками.",
    tags: ["quiz", "learning"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Ты наставник по теме “${topic}”. Составь квиз на 6 вопросов: 3 с выбором, 3 открытых.`,
        "После каждого вопроса показывай правильный ответ и краткое объяснение.",
        "Если ответ неверный, дай подсказку, куда посмотреть или что перечитать.",
      ].join(" ");
    },
  },
  {
    id: "prompt:practice:tasks",
    title: "Составь упражнения",
    description: "Практика с ростом сложности и проверочными критериями.",
    tags: ["practice", "skills"],
    interestTitles: ["английский язык", "english", "программирование", "python"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Подготовь 5 практических упражнений по теме “${topic}” от простого к сложному.`,
        "Для каждого упражнения укажи: цель, шаги, критерий самопроверки, сколько времени закладывать.",
        describeMode(ctx),
      ].join(" ");
    },
  },
  {
    id: "prompt:sources:curation",
    title: "Подбор источников",
    description: "Лаконичный список лучших каналов, книг и статей.",
    tags: ["sources", "curation"],
    build: (ctx) => {
      const scope = formatInterestList(ctx);
      return [
        `Сделай подборку из 8 качественных источников по ${scope}: 3 статьи/блога, 2 книги, 2 канала, 1 подкаст или видео.`,
        "Для каждого укажи название, чем полезен и уровень (новичок/средний/продвинутый).",
        "Без ссылок. Только проверенные и актуальные материалы.",
      ].join(" ");
    },
  },
  {
    id: "prompt:eli5:explain",
    title: "Объясни простыми словами",
    description: "Разложи сложное на аналогии и примеры.",
    tags: ["eli5", "teaching"],
    clusters: ["ai", "data", "tech"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Объясни “${topic}” простыми словами как для новичка.`,
        "Дай бытовую аналогию, 2 практических примера и одно типичное заблуждение.",
        describeMode(ctx),
        "Короткие абзацы, без жаргона.",
      ].join(" ");
    },
  },
  {
    id: "prompt:critical:thinking",
    title: "Критическое мышление",
    description: "Разбери сильные/слабые стороны и риски.",
    tags: ["critical", "analysis"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Проанализируй идею/подход по теме “${topic}”.`,
        "Дай список сильных сторон, слабых мест, рисков и скрытых допущений.",
        "Отметь, какие когнитивные искажения могут возникнуть, и предложи проверки/контрпримеры.",
      ].join(" ");
    },
  },
  {
    id: "prompt:project:roadmap",
    title: "Проектный план",
    description: "Дорожная карта с этапами, рисками и метриками.",
    tags: ["project", "roadmap"],
    clusters: ["product", "startup", "design", "data"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Собери план пилотного проекта по теме “${topic}”.`,
        "Этапы: исследования, прототип, проверка гипотез, запуск, метрики.",
        "Для каждого этапа: цель, 3–5 задач, метрика успеха, возможные риски и как их снизить.",
      ].join(" ");
    },
  },
  {
    id: "prompt:checklist:today",
    title: "Чеклист действий",
    description: "Что сделать сегодня, чтобы продвинуться.",
    tags: ["action", "focus"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Составь чеклист из 6 коротких действий на день по теме “${topic}”.`,
        "Делай акцент на задачах, которые можно выполнить за 15–40 минут.",
        "Добавь блок “если осталось время” с 2 задачами и критериями завершения.",
      ].join(" ");
    },
  },
  {
    id: "prompt:reflection:questions",
    title: "Рефлексия",
    description: "Набор вопросов для осмысления прогресса.",
    tags: ["reflection", "journal"],
    build: (ctx) => {
      const scope = formatInterestList(ctx);
      return [
        `Дай 7 вопросов для рефлексии по ${scope}.`,
        "Покрой: что получилось, чему научился, что тормозит, что удивило, что попробовать иначе.",
        "Сформулируй так, чтобы ответы занимали 3–4 предложения.",
      ].join(" ");
    },
  },
  {
    id: "prompt:mentor:coach",
    title: "Ментор",
    description: "Советы в формате коучинговых шагов.",
    tags: ["mentor", "guidance"],
    clusters: ["career", "management"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Представь, что ты ментор и коуч. Помоги по теме “${topic}”.`,
        "Дай 3 коротких вопроса, чтобы уточнить запрос. Затем предложи 5 шагов с фокусом на действия и обратную связь, которую стоит собрать.",
        "Тон доброжелательный, без клише.",
      ].join(" ");
    },
  },
  {
    id: "prompt:ideas:brainstorm",
    title: "Генерация идей",
    description: "5–7 идей с указанием, как быстро проверить.",
    tags: ["ideas", "brainstorm"],
    build: (ctx) => {
      const topic = primaryTitle(ctx);
      return [
        `Сгенерируй 7 идей по теме “${topic}”: свежие, практичные, без очевидных советов.`,
        "Для каждой идеи добавь одно действие для проверки за 1–2 дня и метрику успеха.",
        describeMode(ctx),
      ].join(" ");
    },
  },
];
