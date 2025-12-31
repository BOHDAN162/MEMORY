"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { savePersonalityAnswers } from "@/app/actions/save-personality-answers";
import { Button } from "@/components/ui/button";
import type { PersonalityAnswerFields } from "@/lib/types/personality";
import { cn } from "@/lib/utils/cn";

type PersonalityQuestionId = keyof PersonalityAnswerFields;

type PersonalityQuestionOption = {
  value: string;
  label: string;
  description?: string;
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
};

const questions: PersonalityQuestion[] = [
  {
    id: "q1",
    title: "Как вы начинаете новые задачи?",
    description: "Подход к старту часто задаёт тон всей работе.",
    options: [
      { value: "structure-first", label: "Составляю план и иду по шагам" },
      { value: "quick-prototype", label: "Сразу делаю быстрый прототип и улучшаю по ходу" },
      { value: "research", label: "Сначала собираю максимум контекста и примеров" },
      { value: "collaboration", label: "Обсуждаю с командой и распределяю роли" },
    ],
  },
  {
    id: "q2",
    title: "Как вы реагируете на изменения требований?",
    options: [
      { value: "adapt-fast", label: "Быстро перестраиваюсь и ищу новое решение" },
      { value: "protect-scope", label: "Стараюсь сохранить договорённый объём" },
      { value: "clarify", label: "Уточняю детали и фиксирую приоритеты" },
    ],
  },
  {
    id: "q3",
    title: "Что помогает вам поддерживать продуктивность?",
    options: [
      { value: "focused-blocks", label: "Глубокая работа блоками времени" },
      { value: "deadlines", label: "Чёткие дедлайны и контрольные точки" },
      { value: "variety", label: "Чередование разных типов задач" },
      { value: "feedback", label: "Регулярный фидбек от команды" },
    ],
  },
  {
    id: "q4",
    title: "Как вы предпочитаете учиться новому?",
    options: [
      { value: "practice", label: "Через практику и эксперименты" },
      { value: "theory", label: "Сначала теория и структурированные курсы" },
      { value: "mentorship", label: "Через созвоны с ментором/экспертами" },
      { value: "community", label: "Обсуждаю в сообществах и рабочих группах" },
    ],
  },
  {
    id: "q5",
    title: "Как вы принимаете решения в неопределённости?",
    options: [
      { value: "hypothesis", label: "Формирую гипотезы и быстро проверяю" },
      { value: "data", label: "Собираю больше данных перед выбором" },
      { value: "intuition", label: "Опираюсь на интуицию и опыт" },
      { value: "consensus", label: "Ищу консенсус и групповое решение" },
    ],
  },
];

const createInitialAnswers = (initialAnswers?: PersonalityAnswerFields | null): PersonalityAnswerFields => ({
  q1: initialAnswers?.q1 ?? "",
  q2: initialAnswers?.q2 ?? "",
  q3: initialAnswers?.q3 ?? "",
  q4: initialAnswers?.q4 ?? "",
  q5: initialAnswers?.q5 ?? "",
});

const findFirstIncompleteQuestion = (answers: PersonalityAnswerFields): number => {
  const index = questions.findIndex((question) => !answers[question.id]);
  return index === -1 ? 0 : index;
};

export const PersonalityQuiz = ({ initialAnswers, loadError }: PersonalityQuizProps) => {
  const [answers, setAnswers] = useState<PersonalityAnswerFields>(() => createInitialAnswers(initialAnswers));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() =>
    findFirstIncompleteQuestion(createInitialAnswers(initialAnswers)),
  );
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const isCurrentAnswered = Boolean(answers[currentQuestion.id]);
  const allAnswered = useMemo(
    () => questions.every((question) => Boolean(answers[question.id])),
    [answers],
  );

  const handleOptionSelect = (questionId: PersonalityQuestionId, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setStatus(null);
  };

  const handlePrevious = () => {
    setStatus(null);
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!isCurrentAnswered) return;
    setStatus(null);
    setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allAnswered || isPending) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        questions.forEach((question) => {
          formData.append(question.id, answers[question.id]);
        });

        const result = await savePersonalityAnswers(formData);

        setStatus(
          result.error
            ? { type: "error", message: result.error }
            : { type: "success", message: result.message ?? "Сохранено" },
        );
      } catch (error) {
        console.error("Failed to save personality answers", error);
        setStatus({
          type: "error",
          message: "Не удалось сохранить ответы. Попробуйте ещё раз.",
        });
      }
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Onboarding</p>
          <h2 className="text-2xl font-semibold">Тест личности</h2>
          <p className="text-sm text-muted-foreground">
            Ответьте на 5 вопросов. Результат нужен, чтобы подготовить рекомендации.
          </p>
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

        <div className="grid gap-3 sm:grid-cols-2">
          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id] === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionSelect(currentQuestion.id, option.value)}
                className={cn(
                  "group flex h-full flex-col gap-2 rounded-xl border border-border bg-background/60 p-4 text-left shadow-[0_12px_40px_-30px_rgba(0,0,0,0.45)] transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  isSelected ? "border-primary ring-2 ring-primary/70" : "",
                )}
                aria-pressed={isSelected}
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
                {option.description ? (
                  <span className="text-sm text-muted-foreground">{option.description}</span>
                ) : null}
              </button>
            );
          })}
        </div>

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
          <div className="flex items-center gap-3">
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
            ) : (
              <Button type="button" onClick={handleNext} disabled={!isCurrentAnswered || isPending}>
                Далее
              </Button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
};
