export interface QuestionChoice {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  choices: QuestionChoice[];
  correct_answer_id: string;
  explanation: string | null;
}

export interface QCMResponse {
  questions: Question[];
  pdf_title: string;
}
