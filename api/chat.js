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

// =========================================
// NEXUS SITE CONTENT (for clickable links only)
// =========================================
const NEXUS_CONTENT = `
Available NEXUS links (for clickable references):
shawshank.html, inception.html, interstellar.html, fightclub.html, forrestgump.html,
matrix.html, shutterisland.html, tenet.html, martian.html, theprestige.html, memento.html,
looper.html, apollo13.html, castaway.html, gravity.html, intothewild.html, meetjoeblack.html,
number23.html, projecthailmary.html, seven.html, perksofbeingawallflower.html,
socialnetwork.html, whoami.html, eventhorizon.html, theexorcist.html, bringherback.html,
whenevillurks.html, insidious.html, ironman.html, ironman2.html, spiderman2.html, thor.html,
rdr1.html, reading.html, listening.html
`;

// =========================================
// PROMPTS — NO EXAMPLES, pure AI generation
// =========================================

function getRecommendSystemPrompt(mood) {
  return `You are Nexus AI, a recommendation assistant on the NEXUS website.

User's mood/category: **${mood}**

You have access to these NEXUS site pages (for optional clickable links):
${NEXUS_CONTENT}

TASK:
Give 3-5 personalized recommendations based on the user's mood.

LINK RULES:
- If you want to link to a NEXUS page, use this exact format: [[link:filename.html|Title]]
- Otherwise just write the title in bold.
- Don't force links if not relevant.

STYLE:
- Short, punchy, one line why per item.
- Use ## heading for the list.
- Match user's language (English/Hindi/Hinglish).
- Friendly tone, occasional emoji.
- No 18+ horror unless asked.

Be creative and varied. Don't repeat the same recommendations across chats.`;
}

function getCosmicPrompt(previousFacts) {
  const seed = Date.now() + '_' + Math.random().toString(36).slice(2);

  return `You are a brilliant astrophysicist and science communicator.

TASK: Generate ONE fascinating cosmic fact. Pick ANY random topic from space, astronomy, physics, or the universe — completely your choice.

PREVIOUS FACTS (avoid repeating or paraphrasing these): ${previousFacts || 'none yet'}

RULES:
1. Must be TRUE, VERIFIABLE, and SURPRISING.
2. 2-3 sentences MAX. Short and punchy.
3. Include specific numbers, distances, or comparisons.
4. Start with a relevant emoji (🌟 🌌 🪐 ⭐ 🌠 🕳️ 💫 🌍 🛰️ ⚡ 🔭).
5. NO intro like "Here's a fact" — say it directly.
6. NO bullet points, NO headings, NO markdown.
7. English only.
8. Be DIFFERENT each time — do not reuse ideas from previous facts.
9. Randomness seed for uniqueness: ${seed}

Return ONLY the fact text. Nothing else.`;
}

function getMixPrompt(submode, localTitles, previousPicks) {
  const seed = Date.now() + '_' + Math.random().toString(36).slice(2);
  const type = submode === 'movie' ? 'movies' : 'movies, games, books, or music';

  return `You are Nexus AI recommending ${type} to a user — real recommendations from your knowledge of world entertainment.

USER WANTS: ${submode === 'movie' ? 'a movie to watch' : 'a random great recommendation'}

DO NOT recommend any of these (already on NEXUS):
${localTitles}

DO NOT repeat these (previously recommended):
${previousPicks || 'none yet'}

TASK:
Suggest EXACTLY 3 real, well-known ${type}.
Each must be genuinely DIFFERENT from the others.
Mix genres, decades, and moods — don't stick to one style.

OUTPUT FORMAT — exactly 3 lines, nothing else:
[[ext:TITLE|TYPE|WHY]]
[[ext:TITLE|TYPE|WHY]]
[[ext:TITLE|TYPE|WHY]]

Where:
- TITLE = real name of the item
- TYPE = movie / game / book / music (lowercase)
- WHY = ONE short sentence (max 12 words)

STRICT RULES:
1. Exactly 3 lines. No intro. No outro. No numbering. No bullets.
2. NO examples should be reused — each call must feel fresh.
3. Real, well-known titles only. No fictional made-up names.
4. Uniqueness seed: ${seed}

Begin now.`;
}

// =========================================
// MAIN HANDLER
// =========================================
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

  if (mode === 'recommend') {
    systemPrompt = getRecommendSystemPrompt(mood || 'Anything good');
    temperature = 1.0;
  } else if (mode === 'cosmic') {
    const previousFacts = (body.previousFacts || []).join(' || ').substring(0, 800);
    systemPrompt = getCosmicPrompt(previousFacts);
    temperature = 1.2;
  } else if (mode === 'mix') {
    const localTitles = (body.localTitles || []).join(', ').substring(0, 500);
    const previousPicks = (body.previousPicks || []).join(', ').substring(0, 500);
    systemPrompt = getMixPrompt(mood || 'random', localTitles, previousPicks);
    temperature = 1.3;
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
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature,
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
    } catch (err) { lastError = err.message; }
  }

  const isRateLimit = lastErrorStatus === 429 ||
    (lastError && (lastError.toLowerCase().includes('rate limit') || lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('too many requests')));

  if (isRateLimit) return res.status(429).json({ error: 'limit_reached', details: 'Nexus AI has reached its daily limit.' });
  return res.status(500).json({ error: 'All AI models failed', details: lastError || 'Please try again later.' });
};