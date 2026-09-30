// Telegram logging
async function logQuestionToTelegram(question, req) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
    const ua = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || 'Direct';

    let device = 'Desktop';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) device = 'Mobile';
    else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

    let browser = 'Other';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    let location = 'Unknown';
    try {
      if (ip !== 'Unknown') {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
        const geoData = await geoRes.json();
        if (geoData.city && geoData.countryCode) {
          location = `${geoData.city}, ${geoData.countryCode}`;
        }
      }
    } catch (e) {}

    let page = 'Direct';
    if (referrer !== 'Direct') {
      const parts = referrer.split('/');
      page = parts[parts.length - 1] || 'index.html';
      if (page === '') page = 'index.html';
    }

    // ✅ SECURITY FIX: Escape special Telegram markdown chars
    const safeQuestion = (question || '').replace(/[*_`\[\]]/g, '').substring(0, 500);
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const text = `💬 *New Question*\n\n🌍 Location: ${location}\n💻 Device: ${device} (${browser})\n📄 Page: ${page}\n🕐 Time: ${time}\n\n❓ *Question:*\n${safeQuestion}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
  } catch (e) {}
}

// =====================
// VISION: Use Pollinations AI (free, no key needed)
// =====================
async function analyzeImageWithPollinations(imageBase64, userQuestion) {
  try {
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: userQuestion || 'Describe this image in detail. What do you see?' 
              },
              { 
                type: 'image_url', 
                image_url: { url: imageBase64 } 
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return { success: true, reply: data.choices[0].message.content };
    }
    
    if (typeof data === 'string') {
      return { success: true, reply: data };
    }
    
    return { success: false, error: 'Unexpected response format' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ✅ SECURITY FIX: Simple in-memory rate limiter (per warm instance)
function checkRateLimit(ip) {
  if (!global._chatRate) global._chatRate = new Map();
  const now = Date.now();
  const WINDOW = 60 * 1000; // 1 minute
  const MAX = 10;
  const rec = global._chatRate.get(ip);
  if (!rec || now - rec.start > WINDOW) {
    global._chatRate.set(ip, { start: now, count: 1 });
    return true;
  }
  if (rec.count >= MAX) return false;
  rec.count++;
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://nexus-project-alpha8.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const message = (body && body.message) || '';
  const history = (body && body.history) || [];
  const image = (body && body.image) || '';

  if (!message && !image) {
    return res.status(400).json({ error: 'Message or image required' });
  }

  // ✅ SECURITY FIX: Size limits
  if (typeof message !== 'string' || message.length > 2000) {
    return res.status(413).json({ error: 'Message too long (max 2000 chars)' });
  }
  if (image && typeof image === 'string' && image.length > 5_000_000) {
    return res.status(413).json({ error: 'Image too large (max ~3.5MB)' });
  }
  if (!Array.isArray(history) || history.length > 20) {
    return res.status(413).json({ error: 'History too long' });
  }

  logQuestionToTelegram(message || '(image sent)', req);

  // =====================
  // IMAGE PATH
  // =====================
  if (image) {
    const result = await analyzeImageWithPollinations(
      image, 
      message || 'Describe this image in detail. What do you see?'
    );

    if (result.success) {
      return res.status(200).json({ success: true, reply: result.reply.trim(), source: 'pollinations' });
    }

    return res.status(200).json({ 
      success: true, 
      reply: `⚠️ **Image analysis is having trouble right now.**\n\nPlease try again later. 🙏`,
      source: 'fallback'
    });
  }

  // =====================
  // TEXT PATH: Groq
  // =====================
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const systemPrompt = `You are Nexus AI, a helpful, intelligent, and friendly AI assistant on the Nexus website.

LANGUAGE RULES:
1. You can speak in ENGLISH, HINDI, and HINGLISH (Roman Hindi).
2. Treat common greetings like "Hello", "Hallo", "Hi", "Hey" as ENGLISH. Always reply warmly.
3. Match the user's language:
   - English → English
   - Hindi (Devanagari) → Hindi
   - Hinglish (Roman Hindi) → Hinglish
4. Stay in the same language.
5. If user asks another language, politely refuse and continue in English.

FORMATTING RULES:
1. Use **bold** for keywords.
2. Use bullet points (•) for lists.
3. Use numbered lists for steps.
4. Blank line between paragraphs.
5. Use ## headers for major sections.
6. Short paragraphs, not walls of text.
7. Add a friendly emoji occasionally.

GENERAL BEHAVIOR:
Answer ANY question - general knowledge, science, history, coding, math, sports, movies, games, books, Marvel, or anything else.
If someone asks something harmful, politely decline.
Always be respectful and warm.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  for (const item of history) {
    if (!item || !item.text) continue;
    messages.push({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.text).substring(0, 2000)
    });
  }

  messages.push({ role: 'user', content: message });

  const modelsToTry = [
    'openai/gpt-oss-120b',
    'qwen/qwen3-32b',
    'qwen/qwen3.6-27b'
  ];

  let lastError = null;
  let lastErrorStatus = null;

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
      lastErrorStatus = response.status;
      
    } catch (err) {
      lastError = err.message;
    }
  }

  const isRateLimit = 
    lastErrorStatus === 429 ||
    (lastError && (
      lastError.toLowerCase().includes('rate limit') ||
      lastError.toLowerCase().includes('quota') ||
      lastError.toLowerCase().includes('too many requests')
    ));

  if (isRateLimit) {
    return res.status(429).json({ 
      error: 'limit_reached',
      details: 'Nexus AI has reached its daily limit.'
    });
  }

  return res.status(500).json({ 
    error: 'All AI models failed', 
    details: lastError || 'Please try again later.' 
  });
};