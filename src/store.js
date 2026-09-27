const QUESTIONS_KEY = 'iqr.questions.v1';
const SETTINGS_KEY = 'iqr.settings.v1';
const STORE_FILE = 'orangutaninterview-store.json';

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

export function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function inTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let storePromise = null;
let writeChain = Promise.resolve();

function getStore() {
  if (!storePromise) {
    storePromise = import('@tauri-apps/plugin-store')
      .then(({ Store }) => Store.load(STORE_FILE))
      .catch((err) => {
        storePromise = null;
        throw err;
      });
  }
  return storePromise;
}

function readLocalArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readLocalObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage may be unavailable in private/blocked contexts; app keeps working in memory
  }
}

function removeLocal(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function enqueueWrite(task) {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => {});
  return next;
}

export async function loadQuestions() {
  if (inTauri()) {
    try {
      const store = await getStore();
      const value = await store.get(QUESTIONS_KEY);
      if (Array.isArray(value)) return value;
      const legacy = readLocalArray(QUESTIONS_KEY);
      if (legacy) {
        await saveQuestions(legacy);
        return legacy;
      }
      return [];
    } catch {
      return readLocalArray(QUESTIONS_KEY) || [];
    }
  }
  return readLocalArray(QUESTIONS_KEY) || [];
}

export async function saveQuestions(questions) {
  const value = Array.isArray(questions) ? questions : [];
  if (inTauri()) {
    try {
      await enqueueWrite(async () => {
        const store = await getStore();
        await store.set(QUESTIONS_KEY, value);
        await store.save();
      });
      return;
    } catch {
      // fall back to localStorage when the desktop store is unavailable
    }
  }
  writeLocal(QUESTIONS_KEY, value);
}

export async function loadSettings() {
  const defaults = { ...DEFAULT_SETTINGS };
  if (inTauri()) {
    try {
      const store = await getStore();
      const value = await store.get(SETTINGS_KEY);
      if (value && typeof value === 'object') return { ...defaults, ...value };
      const legacy = readLocalObject(SETTINGS_KEY);
      if (legacy) {
        await saveSettings({ ...defaults, ...legacy });
        return { ...defaults, ...legacy };
      }
      return defaults;
    } catch {
      return { ...defaults, ...(readLocalObject(SETTINGS_KEY) || {}) };
    }
  }
  return { ...defaults, ...(readLocalObject(SETTINGS_KEY) || {}) };
}

export async function saveSettings(settings) {
  const value = settings && typeof settings === 'object' ? settings : { ...DEFAULT_SETTINGS };
  if (inTauri()) {
    try {
      await enqueueWrite(async () => {
        const store = await getStore();
        await store.set(SETTINGS_KEY, value);
        await store.save();
      });
      return;
    } catch {
      // fall back to localStorage when the desktop store is unavailable
    }
  }
  writeLocal(SETTINGS_KEY, value);
}

export async function clearLocalData() {
  if (inTauri()) {
    try {
      await enqueueWrite(async () => {
        const store = await getStore();
        await store.delete(QUESTIONS_KEY);
        await store.delete(SETTINGS_KEY);
        await store.save();
      });
    } catch {
      // fall through to localStorage cleanup below
    }
  }
  removeLocal(QUESTIONS_KEY);
  removeLocal(SETTINGS_KEY);
}
