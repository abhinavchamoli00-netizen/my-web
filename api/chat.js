// Telegram logging
async function logQuestionToTelegram(question, req, deviceModel) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'Unknown';
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
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,countryCode`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          location = `${geoData.city}, ${geoData.regionName}, ${geoData.countryCode}`;
        }
      }
    } catch (e) {}

    let page = 'Direct';
    if (referrer !== 'Direct') {
      const parts = referrer.split('/');
      page = parts[parts.length - 1] || 'index.html';
    }

    const safeQuestion = (question || '').replace(/[*_`\[\]]/g, '').substring(0, 500);
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    let deviceStr = device + ' (' + browser + ')';
    if (deviceModel) deviceStr = device + ' • ' + deviceModel;

    const text = `💬 *New Question*\n\n🌍 Location: ${location}\n💻 Device: ${deviceStr}\n🌐 IP: \`${ip}\`\n📄 Page: ${page}\n🕐 Time: ${time}\n\n❓ *Question:*\n${safeQuestion}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
  } catch (e) {}
}

function checkRateLimit(ip) {
  if (!global._chatRate) global._chatRate = new Map();
  const now = Date.now();
  const WINDOW = 60 * 1000;
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

const NEXUS_CONTENT = `
Available NEXUS links:
shawshank.html, inception.html, interstellar.html, fightclub.html, forrestgump.html,
matrix.html, shutterisland.html, tenet.html, martian.html, theprestige.html, memento.html,
looper.html, apollo13.html, castaway.html, gravity.html, intothewild.html, meetjoeblack.html,
number23.html, projecthailmary.html, seven.html, perksofbeingawallflower.html,
socialnetwork.html, whoami.html, eventhorizon.html, theexorcist.html, bringherback.html,
whenevillurks.html, insidious.html, ironman.html, ironman2.html, spiderman2.html, thor.html,
rdr1.html, reading.html, listening.html
`;

function getRecommendSystemPrompt(mood) {
  return `You are Nexus AI recommending on the NEXUS website.

User mood: **${mood}**

NEXUS pages you can link (use [[link:filename.html|Title]] format):
${NEXUS_CONTENT}

TASK: Give 3-5 recommendations matching the mood. Mix NEXUS-linked items with external picks. Short "why" per item. Friendly tone. Match user's language.`;
}

function getCosmicPrompt(previousFacts) {
  const seed = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  return `You are an astrophysicist. Generate ONE surprising, verifiable, TRUE cosmic fact.

RANDOMNESS TOKEN: ${seed}

FORBIDDEN (do not reuse these topics or facts): ${previousFacts || 'none'}

DEEPLY IMPORTANT:
- Pick a RANDOMLY CHOSEN niche topic — not the most obvious ones like "black holes bend light" or "Sun is a star".
- Every output MUST be about a DIFFERENT topic than previous ones.
- Think of obscure corners: specific moons, specific missions, weird physics, unusual stars, historical space events.

FORMAT:
- 2-3 sentences MAX.
- Start with one emoji.
- No intro, no headings, no bullets. Just the fact.
- English.

Return ONLY the fact text.`;
}

function getMixPrompt(submode, localTitles, previousPicks) {
  const seed = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const type = submode === 'movie' ? 'movies' : 'items';

  return `Recommend 3 ${type} from world entertainment.

RANDOMNESS TOKEN: ${seed}

AVOID (already on NEXUS): ${localTitles}
AVOID (previously recommended): ${previousPicks || 'none'}

MUST:
- 3 REAL, well-known titles, all DIFFERENT from each other and from avoid list.
- Vary genres/years/moods. No clustering.
- Format EXACTLY (3 lines, nothing else):
[[ext:TITLE|TYPE|WHY]]

TYPE = movie/game/book/music
WHY = max 12 words
NO intro, NO outro, NO bullets, NO numbering.

Begin.`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
  const deviceModel = (body && body.deviceModel) || '';
  const mode = (body && body.mode) || 'chat';
  const mood = (body && body.mood) || '';

  if (!message) return res.status(400).json({ error: 'Message required' });
  if (typeof message !== 'string' || message.length > 2000) return res.status(413).json({ error: 'Message too long' });
  if (!Array.isArray(history) || history.length > 20) return res.status(413).json({ error: 'History too long' });

  logQuestionToTelegram(`[${mode}] ${message}`, req, deviceModel);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  let systemPrompt;
  let temperature = 0.7;
  let frequencyPenalty = 0;
  let presencePenalty = 0;

  if (mode === 'recommend') {
    systemPrompt = getRecommendSystemPrompt(mood || 'Anything good');
    temperature = 1.1;
    frequencyPenalty = 1.2;
    presencePenalty = 1.0;
  } else if (mode === 'cosmic') {
    const previousFacts = (body.previousFacts || []).join(' || ').substring(0, 800);
    systemPrompt = getCosmicPrompt(previousFacts);
    temperature = 1.4;
    frequencyPenalty = 1.8;
    presencePenalty = 1.5;
  } else if (mode === 'mix') {
    const localTitles = (body.localTitles || []).join(', ').substring(0, 500);
    const previousPicks = (body.previousPicks || []).join(', ').substring(0, 500);
    systemPrompt = getMixPrompt(mood || 'random', localTitles, previousPicks);
    temperature = 1.5;
    frequencyPenalty = 1.8;
    presencePenalty = 1.5;
  } else {
    systemPrompt = `You are Nexus AI, a helpful, intelligent, and friendly AI assistant on the Nexus website.

LANGUAGE RULES:
1. You can speak in ENGLISH, HINDI, and HINGLISH (Roman Hindi).
2. Match the user's language.
3. If user asks another language, politely refuse and continue in English.

FORMATTING RULES:
1. Use **bold** for keywords.
2. Use bullet points (•) for lists.
3. Blank line between paragraphs.
4. Use ## headers for major sections.
5. Short paragraphs, not walls of text.
6. Add a friendly emoji occasionally.

GENERAL BEHAVIOR:
Answer ANY question — general knowledge, science, history, coding, math, sports, movies, games, books, Marvel, or anything else.
If someone asks something harmful, politely decline.`;
  }

  const messages = [{ role: 'system', content: systemPrompt }];
  for (const item of history) {
    if (!item || !item.text) continue;
    messages.push({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.text).substring(0, 2000)
    });
  }
  messages.push({ role: 'user', content: message });

  const modelsToTry = ['openai/gpt-oss-120b', 'qwen/qwen3-32b', 'qwen/qwen3.6-27b'];
  let lastError = null;
  let lastErrorStatus = null;

  for (const modelName of modelsToTry) {
    try {
      const requestBody = {
        model: modelName,
        messages,
        temperature,
        max_tokens: 2048
      };

      // Add penalties for non-chat modes
      if (mode !== 'chat') {
        requestBody.frequency_penalty = frequencyPenalty;
        requestBody.presence_penalty = presencePenalty;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (response.ok && data.choices && data.choices[0]) {
        const aiText = data.choices[0].message?.content || "Sorry, I couldn't generate a response.";
        return res.status(200).json({ success: true, reply: aiText.trim(), model: modelName });
      }
      lastError = data.error?.message || 'Unknown error';
      lastErrorStatus = response.status;
    } catch (err) { lastError = err.message; }
  }

  const isRateLimit = lastErrorStatus === 429 ||
    (lastError && (lastError.toLowerCase().includes('rate limit') || lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('too many requests')));

  if (isRateLimit) return res.status(429).json({ error: 'limit_reached', details: 'Nexus AI has reached its daily limit.' });
  return res.status(500).json({ error: 'All AI models failed', details: lastError || 'Please try again later.' });
};