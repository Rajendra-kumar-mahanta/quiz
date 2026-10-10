export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionData {
  id: string;
  type: string; // MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE
  points: number;
  duration: number;
  options: QuestionOption[];
}

export interface ScoreResult {
  isCorrect: boolean;
  baseMarks: number;
  speedBonus: number;
  totalMarks: number;
  remainingSeconds: number;
  responseTimeMs: number;
  status: 'SUBMITTED' | 'TIMEOUT' | 'DISQUALIFIED';
}

/**
 * Server-authoritative scoring engine
 */
export function evaluateSubmission(
  question: QuestionData,
  selectedOptionIds: string[],
  serverReceivedAt: Date,
  questionStartedAt: Date,
  questionDeadline: Date,
  baseMarksConfig: number = 10,
  maxBonusConfig: number = 10,
  negativeMarking: boolean = false,
  negativeMarks: number = 0
): ScoreResult {
  const receivedMs = serverReceivedAt.getTime();
  const startMs = questionStartedAt.getTime();
  const deadlineMs = questionDeadline.getTime();

  // Calculate response time in ms
  const responseTimeMs = Math.max(0, receivedMs - startMs);

  // Check deadline with a small grace period (e.g. 500ms for network transit)
  const isLate = receivedMs > (deadlineMs + 500);

  if (isLate) {
    return {
      isCorrect: false,
      baseMarks: 0,
      speedBonus: 0,
      totalMarks: 0,
      remainingSeconds: 0,
      responseTimeMs,
      status: 'TIMEOUT'
    };
  }

  // Calculate remaining seconds constrained to [0, duration]
  const remainingMs = Math.max(0, deadlineMs - receivedMs);
  const remainingSeconds = Math.min(question.duration, Math.ceil(remainingMs / 1000));

  // Determine correctness
  const correctOptionIds = question.options
    .filter((opt) => opt.isCorrect)
    .map((opt) => opt.id);

  let isCorrect = false;

  if (question.type === 'MCQ_MULTIPLE') {
    // For multiple answer: must select all correct and no incorrect
    const selectedSet = new Set(selectedOptionIds);
    const correctSet = new Set(correctOptionIds);

    isCorrect =
      selectedSet.size === correctSet.size &&
      [...selectedSet].every((id) => correctSet.has(id));
  } else {
    // Single choice or True/False: exactly 1 selection matching 1 correct option
    if (selectedOptionIds.length === 1 && correctOptionIds.includes(selectedOptionIds[0])) {
      isCorrect = true;
    }
  }

  if (!isCorrect) {
    const penalty = negativeMarking ? Math.abs(negativeMarks) : 0;
    return {
      isCorrect: false,
      baseMarks: 0,
      speedBonus: 0,
      totalMarks: -penalty,
      remainingSeconds,
      responseTimeMs,
      status: 'SUBMITTED'
    };
  }

  // Calculate speed bonus: floor(remainingSeconds / 3), capped at maxBonus
  const speedBonus = Math.min(maxBonusConfig, Math.floor(remainingSeconds / 3));
  const baseMarks = baseMarksConfig || question.points || 10;
  const totalMarks = baseMarks + speedBonus;

  return {
    isCorrect: true,
    baseMarks,
    speedBonus,
    totalMarks,
    remainingSeconds,
    responseTimeMs,
    status: 'SUBMITTED'
  };
}

/**
 * Deterministic Leaderboard Ranking comparator:
 * 1. Higher total score
 * 2. Greater number of correct answers
 * 3. Lower aggregate response time (faster)
 * 4. Earlier join timestamp
 * 5. Deterministic ID fallback
 */
export function sortParticipants(participants: any[]): any[] {
  return [...participants].sort((a, b) => {
    // 1. Total score descending
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // 2. Correct count descending
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    // 3. Response time ascending (faster wins)
    if (a.totalResponseTimeMs !== b.totalResponseTimeMs) {
      return a.totalResponseTimeMs - b.totalResponseTimeMs;
    }
    // 4. Joined at ascending
    const timeA = new Date(a.joinedAt).getTime();
    const timeB = new Date(b.joinedAt).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    // 5. Stable ID
    return a.id.localeCompare(b.id);
  });
}
