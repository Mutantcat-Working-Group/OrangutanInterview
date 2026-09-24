export const DEFAULT_SYSTEM_PROMPT =
  '你是一名资深的技术面试辅导老师。回答要专业、准确、结构化，使用 Markdown 排版；先给出结论，再补充关键原理、代码示例与常见追问。若题目本身有歧义，按最常见的考察意图作答。';

function cleanBaseUrl(value) {
  return (value || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
}

function buildUserPrompt(question) {
  const parts = [
    '请回答下面的面试题。要求：结论先行，结构清晰，使用 Markdown；说明关键原理，必要时给出代码示例；最后列出 1-3 个面试官常追问的问题。',
  ];
  if (question.category) parts.push(`题目分类：${question.category}`);
  if (question.difficulty) parts.push(`难度：${question.difficulty}`);
  parts.push(`面试题：${question.text}`);
  return parts.join('\n');
}

export async function generateAnswer({ question, settings, onDelta, signal }) {
  const baseUrl = cleanBaseUrl(settings.baseUrl);
  const url = `${baseUrl}/chat/completions`;
  const payload = {
    model: settings.model,
    temperature: Number(settings.temperature) || 0.7,
    max_tokens: Number(settings.maxTokens) || 2000,
    stream: settings.stream !== false,
    messages: [
      { role: 'system', content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(question) },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`接口返回 ${response.status}${detail ? `：${detail.slice(0, 300)}` : ''}`);
  }

  if (!settings.stream) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (onDelta) onDelta(content);
    return content;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (onDelta) onDelta(content);
    return content;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payloadText = trimmed.slice(5).trim();
      if (!payloadText || payloadText === '[DONE]') continue;
      try {
        const json = JSON.parse(payloadText);
        const delta =
          json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
        if (delta) {
          full += delta;
          if (onDelta) onDelta(delta);
        }
      } catch {
        // ignore partial or non-JSON SSE fragments
      }
    }
  }

  return full;
}

export async function testConnection(settings, signal) {
  const baseUrl = cleanBaseUrl(settings.baseUrl);
  const url = `${baseUrl}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      max_tokens: 16,
      stream: false,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`接口返回 ${response.status}${detail ? `：${detail.slice(0, 300)}` : ''}`);
  }
  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || '';
  return reply;
}
