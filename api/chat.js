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

STRICT LANGUAGE RULES (Follow these always):
1. You are ONLY allowed to reply in TWO languages: ENGLISH and HINDI.
2. By DEFAULT, always reply in ENGLISH.
3. If the user asks you to reply in Hindi (e.g., "Hindi mein bolo", "Hindi mein jawab do"), then switch to Hindi.
4. If the user asks you to reply in ANY OTHER language (like Chinese, Spanish, French, Japanese, etc.), you MUST politely refuse and continue in English. Say: "Sorry, I can only communicate in English and Hindi. Let me continue in English."
5. NEVER reply in any language other than English or Hindi, no matter what. No exceptions.

GENERAL BEHAVIOR:
You can answer ANY question the user asks, just like ChatGPT - general knowledge, science, history, coding, math, movies, games, books, Marvel, or anything else.
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
        model: 'openai/gpt-oss-20b',
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