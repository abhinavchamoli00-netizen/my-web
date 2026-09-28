module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const message = (body && body.message) || '';
  const history = (body && body.history) || [];

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const messages = [
    { role: 'system', content: `You are Nexus AI, a helpful, intelligent, and friendly AI assistant on the Nexus website.

LANGUAGE RULES (VERY IMPORTANT - Follow strictly):
1. You are ONLY allowed to communicate in TWO languages: ENGLISH and HINDI.
2. ALWAYS match the language of the user's message:
   - If the user writes in English → Reply in English.
   - If the user writes in Hindi (Devanagari script) → Reply in Hindi (Devanagari).
   - If the user writes in Hinglish (Hindi words in Roman letters, like "kaise ho") → Reply in Hinglish (same style).
3. STAY in that language for the entire conversation. Do NOT switch back to English on your own.
4. Only switch language when the user explicitly changes their language or asks you to.
5. If the user asks you to reply in ANY OTHER language (Chinese, Spanish, etc.), politely refuse and continue in English.
6. NEVER reply in any language other than English or Hindi, no matter what.

GENERAL BEHAVIOR:
You can answer ANY question - general knowledge, science, history, coding, math, sports, movies, games, books, Marvel, or anything else.
Keep answers friendly, helpful, and concise (2-3 short paragraphs max).
If someone asks something harmful or inappropriate, politely decline.
Always be respectful.` }
  ];

  for (const item of history) {
    messages.push({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.text
    });
  }

  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // ✅ Simple chat model (no tool calling)
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Groq API failed', 
        details: data.error?.message || 'Unknown error' 
      });
    }

    const aiText = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return res.status(200).json({ success: true, reply: aiText.trim() });

  } catch (error) {
    return res.status(500).json({ error: 'Internal error', details: error.message });
  }
};