
export interface StudyNotes {
  topicOverview: string;
  detailedExplanation: string;
  keyPoints: string[];
  examples: string[];
  commonMistakes: string[];
  examTips: string[];
  studyQuestions: {
    mcqs: { question: string; options: string[]; answer: string }[];
    shortAnswers: { question: string; answer: string }[];
    examStyle: { question: string; modelAnswer: string };
  };
}

export interface NoteHistoryItem {
  id: string;
  timestamp: number;
  originalText: string;
  notes: StudyNotes;
}
