export type PersonalityAnswerFields = {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  q5: number | null;
};

export type PersonalityTypeId =
  | "strategist"
  | "practitioner"
  | "explorer"
  | "creator"
  | "communicator"
  | "generalist";

export type PersonalityType = {
  typeId: PersonalityTypeId;
  title: string;
  slogan: string;
  strengths: string[];
};
