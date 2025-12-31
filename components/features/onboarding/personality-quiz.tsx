"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { savePersonalityAnswers } from "@/app/actions/save-personality-answers";
import { Button } from "@/components/ui/button";
import type { PersonalityAnswerFields } from "@/lib/types/personality";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";

type PersonalityQuestionId = keyof PersonalityAnswerFields;

type PersonalityQuestionOption = {
  value: number;
  label: string;
};

type PersonalityQuestion = {
  id: PersonalityQuestionId;
  title: string;
  description?: string;
  options: PersonalityQuestionOption[];
};

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

type PersonalityQuizProps = {
  initialAnswers?: PersonalityAnswerFields | null;
  loadError?: string | null;
  onCompleteRedirectPath?: string;
  badge?: string;
  title?: string;
  description?: string;
  returnLabel?: string;
};

const questions: PersonalityQuestion[] = [
  {
    id: "q1",
    title: "Как ты чаще действуешь?",
    options: [
      { value: 1, label: "Планирую заранее" },
      { value: 2, label: "Импровизирую" },
      { value: 3, label: "Делаю по шагам" },
      { value: 4, label: "Пробую разное" },
    ],
  },
  {
    id: "q2",
    title: "Что тебе ближе?",
    options: [
      { value: 1, label: "Люди и общение" },
      { value: 2, label: "Идеи и смысл" },
      { value: 3, label: "Дела и результат" },
      { value: 4, label: "Творчество" },
    ],
  },
  {
    id: "q3",
    title: "Как учишься лучше?",
    options: [
      { value: 1, label: "Короткими шагами" },
      { value: 2, label: "Сразу в практике" },
      { value: 3, label: "С примерами/видео" },
      { value: 4, label: "Читаю и думаю" },
    ],
  },
  {
    id: "q4",
    title: "Когда сложно, ты…",
    options: [
      { value: 1, label: "Прошу помощь" },
      { value: 2, label: "Разбираюсь сам" },
      { value: 3, label: "Откладываю на потом" },
      { value: 4, label: "Делаю как получится" },
    ],
  },
  {
    id: "q5",
    title: "В выборе ты чаще…",
    options: [
      { value: 1, label: "Быстро решаю" },
      { value: 2, label: "Собираю факты" },
      { value: 3, label: "Слушаю интуицию" },
      { value: 4, label: "Советуюсь с людьми" },
    ],
  },
];

const normalizeAnswer = (value: number | null | undefined): number | null => {
  if (typeof value !== "number") return null;
  if (!Number.isInteger(value)) return null;
  if (value < 1 || value > 4) return null;
  return value;
};

const createInitialAnswers = (initialAnswers?: PersonalityAnswerFields | null): PersonalityAnswerFields => ({
  q1: normalizeAnswer(initialAnswers?.q1),
  q2: normalizeAnswer(initialAnswers?.q2),
  q3: normalizeAnswer(initialAnswers?.q3),
  q4: normalizeAnswer(initialAnswers?.q4),
  q5: normalizeAnswer(initialAnswers?.q5),
});

const findFirstIncompleteQuestion = (answers: PersonalityAnswerFields): number => {
  const index = questions.findIndex((question) => answers[question.id] === null);
  return index === -1 ? 0 : index;
};

export const PersonalityQuiz = ({
  initialAnswers,
  loadError,
  onCompleteRedirectPath = "/profile",
  badge = "Персонализация",
  title = "Тест личности",
  description = "Ответьте на 5 вопросов, чтобы помочь нам подобрать более точные рекомендации.",
  returnLabel = "Вернуться в профиль",
}: PersonalityQuizProps) => {
  const router = useRouter();
  const sanitizedInitialAnswers = useMemo(
    () => createInitialAnswers(initialAnswers),
    [initialAnswers],
  );
  const [answers, setAnswers] = useState<PersonalityAnswerFields>(sanitizedInitialAnswers);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() =>
    findFirstIncompleteQuestion(sanitizedInitialAnswers),
  );
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasSaved, setHasSaved] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const optionCount = currentQuestion.options.length;
  const hasValidOptionCount = optionCount === 4;

  const allAnswered = useMemo(
    () => questions.every((question) => answers[question.id] !== null),
    [answers],
  );

  useEffect(() => {
    setAnswers(sanitizedInitialAnswers);
    setCurrentQuestionIndex(findFirstIncompleteQuestion(sanitizedInitialAnswers));
  }, [sanitizedInitialAnswers]);

  useEffect(() => {
    if (!hasValidOptionCount) {
      console.warn(
        `Personality question ${currentQuestion.id} is misconfigured: expected 4 options, received ${optionCount}.`,
      );
    }
  }, [currentQuestion.id, hasValidOptionCount, optionCount]);

  const handleOptionSelect = (questionId: PersonalityQuestionId, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setStatus(null);

    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
    }
  };

  const handlePrevious = () => {
    setStatus(null);
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allAnswered || isPending) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        questions.forEach((question) => {
          formData.append(question.id, String(answers[question.id]));
        });

        const result = await savePersonalityAnswers(formData);

        if (result.error) {
          setStatus({ type: "error", message: result.error });
          return;
        }

        setStatus({ type: "success", message: result.message ?? "Сохранено" });
        setHasSaved(true);
      } catch (error) {
        console.error("Failed to save personality answers", error);
        setStatus({
          type: "error",
          message: "Не удалось сохранить ответы. Попробуйте ещё раз.",
        });
      }
    });
  };

  const handleReturn = () => {
    router.push(onCompleteRedirectPath);
  };

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">{badge}</p>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Вопрос {currentQuestionIndex + 1} из {questions.length}
        </div>
      </div>

      {loadError ? (
        <p className="mb-4 text-sm text-destructive">Не удалось загрузить сохранённые ответы: {loadError}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <p className="text-lg font-semibold">{currentQuestion.title}</p>
          {currentQuestion.description ? (
            <p className="text-sm text-muted-foreground">{currentQuestion.description}</p>
          ) : null}
        </div>

        {hasValidOptionCount ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionSelect(currentQuestion.id, option.value)}
                  className={cn(
                    "group flex h-full flex-col gap-2 rounded-xl border border-border bg-background/60 p-4 text-left shadow-[0_12px_40px_-30px_rgba(0,0,0,0.45)] transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-70",
                    isSelected ? "border-primary ring-2 ring-primary/70" : "",
                  )}
                  aria-pressed={isSelected}
                  disabled={isPending}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold">{option.label}</span>
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-xs font-semibold transition",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card/70 text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Вопрос временно недоступен. Попробуйте обновить страницу или сообщите команде.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {status ? (
              <span className={status.type === "success" ? "text-green-600" : "text-destructive"}>
                {status.message}
              </span>
            ) : (
              <span>Ответьте на каждый вопрос, чтобы перейти дальше.</span>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {hasSaved ? (
              <Button
                type="button"
                variant="soft"
                onClick={handleReturn}
                disabled={isPending}
                className="sm:order-1"
              >
                {returnLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || isPending}
            >
              Назад
            </Button>
            {isLastQuestion ? (
              <Button type="submit" disabled={!allAnswered || isPending}>
                {isPending ? "Сохраняем..." : "Сохранить"}
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
};
