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

  // ✅ Naya System Prompt (General Purpose AI)
  const messages = [
    { role: 'system', content: `You are Nexus AI, a helpful, intelligent, and friendly AI assistant. 
You can answer ANY question the user asks, just like ChatGPT. 
The website you are on features movie reviews, game reviews, reading recommendations, and Marvel content, but you are NOT limited to these topics. 
You can answer general knowledge, science, history, coding, math, or any other questions.
Keep your answers friendly, helpful, and concise (2-3 short paragraphs max). 
If someone asks something inappropriate or harmful, politely decline. 
Always be respectful and encouraging.` }
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
        temperature: 0.8,
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