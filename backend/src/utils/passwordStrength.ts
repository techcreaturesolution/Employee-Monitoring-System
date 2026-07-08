import zxcvbn from 'zxcvbn';

export const MIN_PASSWORD_SCORE = 2; // 0 (weak) - 4 (strong)

export const checkPasswordStrength = (password: string, userInputs: string[] = []) => {
  const result = zxcvbn(password, userInputs);
  return {
    score: result.score,
    isStrong: result.score >= MIN_PASSWORD_SCORE,
    feedback: result.feedback.warning || result.feedback.suggestions[0] || null,
  };
};
