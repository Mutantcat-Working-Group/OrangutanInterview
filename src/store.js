const QUESTIONS_KEY = 'iqr.questions.v1';
const SETTINGS_KEY = 'iqr.settings.v1';

export const DEFAULT_SETTINGS = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt:
    '你是一名资深的技术面试辅导老师。回答要专业、准确、结构化，使用 Markdown 排版；先给出结论，再补充关键原理、代码示例与常见追问。若题目本身有歧义，按最常见的考察意图作答。',
  temperature: 0.7,
  maxTokens: 2000,
  stream: true,
};

export function loadQuestions() {
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuestions(questions) {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch {
    // storage may be unavailable in private/blocked contexts; app keeps working in memory
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage may be unavailable in private/blocked contexts
  }
}

export function clearLocalData() {
  localStorage.removeItem(QUESTIONS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

export function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
