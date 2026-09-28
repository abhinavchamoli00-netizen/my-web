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

LANGUAGE RULES:
1. You can speak in ENGLISH, HINDI, and HINGLISH (Roman Hindi).
2. Treat common greetings like "Hello", "Hallo", "Hi", "Hey" as ENGLISH. Always reply warmly.
3. Match the user's language:
   - English message → Reply in English
   - Hindi (Devanagari script) → Reply in Hindi
   - Hinglish (Roman Hindi like "kaise ho") → Reply in Hinglish
4. Stay in the same language for the entire conversation. Only switch if the user switches.
5. If the user asks for another language (Chinese, Spanish, etc.), politely refuse and continue in English.

FORMATTING RULES (VERY IMPORTANT):
Always format your responses beautifully using markdown:
1. Use **bold** for important keywords, topic names, or key points.
2. Use bullet points (start line with "• " or "- ") for lists of items, tips, or steps.
3. Use numbered lists (1. 2. 3.) for sequential steps or ordered points.
4. Leave a BLANK LINE between paragraphs for proper spacing.
5. Use ## headers (like "## Key Points") for major sections when answer is long.
6. Break long answers into short 1-2 sentence paragraphs. Do NOT write huge walls of text.
7. Add a friendly emoji at the end sometimes (like 🚀, 💡, ✅) but not in every message.

EXAMPLE FORMAT:
"Here are a few tips:

**Tip 1:** Stay calm and patient.

**Tip 2:** Focus on self-improvement.

• Respect her decision
• Give her space
• Work on yourself

Take care! 🚀"

GENERAL BEHAVIOR:
Answer ANY question - general knowledge, science, history, coding, math, sports, movies, games, books, Marvel, or anything else.
If someone asks something harmful or inappropriate, politely decline.
Always be respectful and warm.` }
  ];

  for (const item of history) {
    messages.push({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.text
    });
  }

  messages.push({ role: 'user', content: message });

  const modelsToTry = [
    'openai/gpt-oss-120b',
    'qwen/qwen3-32b',
    'qwen/qwen3.6-27b'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]) {
        const aiText = data.choices[0].message?.content || "Sorry, I couldn't generate a response.";
        return res.status(200).json({ success: true, reply: aiText.trim(), model: modelName });
      }

      lastError = data.error?.message || 'Unknown error';
      
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({ 
    error: 'All AI models failed', 
    details: lastError || 'Please check your Groq API key and try again later.' 
  });
};