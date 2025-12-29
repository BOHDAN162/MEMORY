# Gamification v0 (skeleton)

Это первый каркас геймификации без БД и внешних API.

## Где логика
- Доменная модель и расчёты: `lib/gamification/*`.
  - `types.ts` — типы XP, уровней, событий и бейджей.
  - `levels.ts` — формулы уровней и прогресса.
  - `achievements.ts` — каталог бейджей и helper для состояния.
  - `store.ts` — локальный store на `localStorage` (ключ `memory.gamification.v0`).
- UI: `components/features/gamification/*`.
  - `progress-card.tsx` — отображение уровня и dev-кнопки начисления XP.
  - `badges-grid.tsx` — список бейджей (заглушки, часть locked).
  - `profile-gamification.tsx` — клиентский блок для страницы профиля.

## Правила импорта
- Не импортировать из `/server/**` в client-компоненты.
- Локальное состояние читается только на клиенте; функции работы с `localStorage` вызываются из client-компонентов.

## Данные и будущие шаги
- Сейчас данные держатся в `localStorage`: `xp`, `events` (до 50 штук), `unlockedBadges`.
- Позже планируется Supabase (таблицы `xp_events`, `user_badges`), но не в этом шаге.
- Планируемые события XP: `COMPLETE_CONTENT`, `SELECT_INTEREST`, `FINISH_ONBOARDING`, `UPDATE_PROFILE`, `CUSTOM`.

## Как расширять
- Новые механики оформляем отдельными задачами.
- Экономику/правила начисления выносим в `lib/gamification`, UI — в `components/features/gamification`.
- Dev-кнопки на проде оставлять нельзя; в следующих этапах заменим событиями из реального продукта.
