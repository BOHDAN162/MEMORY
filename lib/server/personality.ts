import "server-only";

import type {
  PersonalityAnswerFields,
  PersonalityTypeId,
} from "@/lib/types/personality";

type PersonalityScores = Record<PersonalityTypeId, number>;

const personalityOrder: PersonalityTypeId[] = [
  "strategist",
  "practitioner",
  "explorer",
  "creator",
  "communicator",
  "generalist",
];

const createInitialScores = (): PersonalityScores => ({
  strategist: 0,
  practitioner: 0,
  explorer: 0,
  creator: 0,
  communicator: 0,
  generalist: 0,
});

const isValidAnswer = (value: number | null): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4;

const validateAnswers = (answers: PersonalityAnswerFields): PersonalityAnswerFields => {
  const normalized = {
    q1: isValidAnswer(answers.q1) ? answers.q1 : null,
    q2: isValidAnswer(answers.q2) ? answers.q2 : null,
    q3: isValidAnswer(answers.q3) ? answers.q3 : null,
    q4: isValidAnswer(answers.q4) ? answers.q4 : null,
    q5: isValidAnswer(answers.q5) ? answers.q5 : null,
  };

  const hasMissing = Object.values(normalized).some((value) => value === null);

  if (hasMissing) {
    throw new Error("Ответы теста неполные или некорректные. Пройдите тест ещё раз.");
  }

  return normalized as PersonalityAnswerFields;
};

const addScore = (scores: PersonalityScores, type: PersonalityTypeId, value: number) => {
  scores[type] += value;
};

const applyQuestionScores = (
  scores: PersonalityScores,
  questionId: keyof PersonalityAnswerFields,
  answer: number,
) => {
  switch (questionId) {
    case "q1": {
      if (answer === 1) addScore(scores, "strategist", 2);
      if (answer === 2) addScore(scores, "creator", 2);
      if (answer === 3) addScore(scores, "practitioner", 2);
      if (answer === 4) addScore(scores, "explorer", 2);
      break;
    }
    case "q2": {
      if (answer === 1) addScore(scores, "communicator", 2);
      if (answer === 2) addScore(scores, "explorer", 2);
      if (answer === 3) addScore(scores, "practitioner", 2);
      if (answer === 4) addScore(scores, "creator", 2);
      break;
    }
    case "q3": {
      if (answer === 1) addScore(scores, "practitioner", 2);
      if (answer === 2) {
        addScore(scores, "practitioner", 1);
        addScore(scores, "creator", 1);
      }
      if (answer === 3) {
        addScore(scores, "communicator", 1);
        addScore(scores, "explorer", 1);
      }
      if (answer === 4) addScore(scores, "explorer", 2);
      break;
    }
    case "q4": {
      if (answer === 1) addScore(scores, "communicator", 2);
      if (answer === 2) {
        addScore(scores, "strategist", 1);
        addScore(scores, "explorer", 1);
      }
      if (answer === 3) addScore(scores, "generalist", 2);
      if (answer === 4) {
        addScore(scores, "creator", 1);
        addScore(scores, "generalist", 1);
      }
      break;
    }
    case "q5": {
      if (answer === 1) {
        addScore(scores, "practitioner", 1);
        addScore(scores, "strategist", 1);
      }
      if (answer === 2) addScore(scores, "explorer", 2);
      if (answer === 3) addScore(scores, "creator", 2);
      if (answer === 4) addScore(scores, "communicator", 2);
      break;
    }
    default:
      break;
  }
};

const resolveBestType = (scores: PersonalityScores): PersonalityTypeId => {
  let bestType: PersonalityTypeId = personalityOrder[0];

  personalityOrder.forEach((type) => {
    const currentScore = scores[type];
    const bestScore = scores[bestType];

    if (currentScore > bestScore) {
      bestType = type;
      return;
    }

    if (currentScore === bestScore) {
      const currentIndex = personalityOrder.indexOf(type);
      const bestIndex = personalityOrder.indexOf(bestType);
      if (currentIndex < bestIndex) {
        bestType = type;
      }
    }
  });

  return bestType;
};

export const determinePersonalityType = (
  answers: PersonalityAnswerFields,
): PersonalityTypeId => {
  const validAnswers = validateAnswers(answers);
  const scores = createInitialScores();

  (Object.keys(validAnswers) as Array<keyof PersonalityAnswerFields>).forEach((questionId) => {
    const answer = validAnswers[questionId];
    applyQuestionScores(scores, questionId, answer as number);
  });

  return resolveBestType(scores);
};
