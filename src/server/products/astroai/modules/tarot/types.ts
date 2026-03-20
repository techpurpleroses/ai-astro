export interface TarotCardDTO {
  id: string;
  name: string;
  number: number;
  arcana: "major" | "minor";
  suit: string | null;
  uprightMeaning: string;
  reversedMeaning: string;
  tipOfDay: string | null;
  imageSlug: string | null;
}

export interface MagicBallAnswerDTO {
  id: string;
  answer: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface TarotDeckDTO {
  cards: TarotCardDTO[];
}

export interface MagicBallPoolDTO {
  answers: MagicBallAnswerDTO[];
  suggestedQuestions: string[];
}
