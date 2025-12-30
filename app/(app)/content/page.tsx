import { getCurrentUserInterests } from "@/lib/server/interests";

const ContentPage = async () => {
  const { data, error } = await getCurrentUserInterests();
  const interests = data ?? [];

  const grouped = interests.reduce<Record<string, typeof interests>>(
    (acc, interest) => {
      const key = interest.cluster?.trim() || "Без кластера";
      acc[key] = acc[key] ? [...acc[key], interest] : [interest];
      return acc;
    },
    {},
  );

  return (
    <section>
      <h1>Контент</h1>

      {error ? <p>Не удалось загрузить интересы: {error}</p> : null}

      {!error && interests.length === 0 ? <p>Интересы не выбраны</p> : null}

      {!error && interests.length > 0 ? (
        <div>
          {Object.entries(grouped).map(([cluster, items]) => (
            <div key={cluster}>
              <p>Cluster: {cluster}</p>
              <ul>
                {items.map((interest) => (
                  <li key={interest.id}>- {interest.title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ContentPage;
