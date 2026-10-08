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
// NEXUS SITE CONTENT (for recommendations)
// =========================================
const NEXUS_CONTENT = `
MOVIES (page: movies.html):
- Shawshank Redemption (shawshank.html) — prison drama, hope, friendship, IMDb 9.3
- Inception (inception.html) — mind-bending sci-fi, dreams within dreams, Nolan, IMDb 8.8
- Interstellar (interstellar.html) — space, time, relativity, father-daughter, Nolan, IMDb 8.7
- Fight Club (fightclub.html) — psychological, identity, anti-establishment, IMDb 8.8
- Forrest Gump (forrestgump.html) — life journey, emotional, IMDb 8.8
- The Matrix (matrix.html) — cyberpunk, simulated reality, action, IMDb 8.7
- Shutter Island (shutterisland.html) — psychological thriller, mystery, IMDb 8.2
- Tenet (tenet.html) — time inversion, complex, Nolan, IMDb 7.3
- The Martian (martian.html) — space survival, science, IMDb 8.0
- The Prestige (theprestige.html) — magicians, obsession, Nolan, IMDb 8.5
- Memento (memento.html) — memory loss, reverse narrative, Nolan, IMDb 8.4
- Looper (looper.html) — time travel, action, IMDb 7.4
- Apollo 13 (apollo13.html) — space mission, survival, true story, IMDb 7.7
- Cast Away (castaway.html) — survival, isolation, IMDb 7.8
- Gravity (gravity.html) — space, survival, tension, IMDb 7.7
- Into the Wild (intothewild.html) — adventure, nature, self-discovery, IMDb 8.1
- Meet Joe Black (meetjoeblack.html) — death, love, philosophical, IMDb 7.2
- Number 23 (number23.html) — psychological, obsession, IMDb 6.4
- Project Hail Mary (projecthailmary.html) — sci-fi, space, survival
- Seven (seven.html) — dark thriller, serial killer, mystery, IMDb 8.6
- Perks of Being a Wallflower (perksofbeingawallflower.html) — coming of age, emotional, IMDb 7.9
- The Social Network (socialnetwork.html) — Facebook origin, drama, IMDb 7.8
- Who Am I (whoami.html) — hacker thriller, mystery, IMDb 7.4
- Event Horizon (eventhorizon.html) — sci-fi horror, 18+, disturbing
- The Exorcist (theexorcist.html) — classic horror, 18+, disturbing
- Bring Her Back (bringherback.html) — horror, 18+, disturbing
- When Evil Lurks (whenevillurks.html) — horror, 18+, disturbing
- Insidious: Out of the Further (insidious.html) — horror, supernatural

MARVEL (page: marvel.html):
- Iron Man (ironman.html) — MCU origin, tech, Tony Stark, IMDb 7.9
- Iron Man 2 (ironman2.html) — MCU, tech, action, IMDb 6.9
- Spider-Man 2 (spiderman2.html) — Sam Raimi, emotional, superhero, IMDb 7.5
- Thor (thor.html) — MCU, Norse mythology, fantasy, IMDb 7.0

GAMES (page: games.html):
- Red Dead Redemption (rdr1.html) — open world western, story, Metacritic 95

BOOKS / READING (page: reading.html):
- Diwar Mein Ek Khidki Rehti Thi (reading.html) — Hindi novel, Vinod Kumar Shukla
- Gunahon Ka Devta (reading.html) — Hindi classic, Dharamvir Bharati, romance

MUSIC (page: listening.html):
- Talha Anjum — Pakistani rapper. Songs: Gumaan, Downers at Dusk, Departure Lane
`;

function getRecommendSystemPrompt(mood) {
  return `You are Nexus AI, a recommendation assistant for the NEXUS website.

The user wants recommendations. Mood/category they chose: **${mood}**

AVAILABLE CONTENT ON NEXUS WEBSITE:
${NEXUS_CONTENT}

INSTRUCTIONS:
1. Recommend **3-5 items** — mix from NEXUS site content above AND from external sources (IMDb, Netflix, Spotify, goodreads, etc.)
2. For NEXUS site items, use this EXACT format to make them clickable:
   [[link:PAGE_URL|TITLE]]
   Example: [[link:inception.html|Inception]]
3. For external recommendations, just use **bold** text — no link format
4. Explain **WHY** each recommendation fits (2-3 short lines)
5. Use bullets, keep it short, friendly
6. Language: match user's input (English/Hindi/Hinglish)
7. If mood is "Surprise Me" — pick random variety
8. Don't recommend 18+ horror movies unless user specifically asks for horror
9. End with a friendly nudge like "Want more like this?"

FORMAT EXAMPLE:
## 🎬 My Picks

**1. [[link:interstellar.html|Interstellar]]** (on Nexus)
Space + time + love story. Perfect if you liked Inception's mind-bending feel.

**2. Arrival** (2016)
Similar slow-burn sci-fi with emotional core. Available on Prime.

**3. [[link:theprestige.html|The Prestige]]** (on Nexus)
Nolan's other masterpiece — obsession, mystery, twist.

Want more? Just tell me the vibe!`;
}

function getCosmicPrompt() {
  const topics = [
    'black holes', 'neutron stars', 'dark matter', 'dark energy',
    'Mars surface', 'Jupiter storms', 'Saturn rings', 'Venus atmosphere',
    'quantum mechanics', 'time dilation', 'the Big Bang', 'the cosmic microwave background',
    'exoplanets', 'rogue planets', 'comets', 'asteroid belts',
    'the Sun', 'the Milky Way', 'Andromeda galaxy', 'galaxy clusters',
    'the speed of light', 'gravitational waves', 'wormholes', 'the multiverse',
    'the oldest stars', 'supernovae', 'pulsars', 'quasars',
    'the Hubble constant', 'space-time fabric', 'the event horizon', 'antimatter',
    'the Oort cloud', 'the Kuiper belt', 'the heliosphere', 'the observable universe',
    'cosmic inflation', 'the Fermi paradox', 'the Drake equation', 'the Great Attractor'
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const seed = Date.now() + Math.random();

  return `You are Nexus AI. Generate ONE fascinating cosmic fact about: **${topic}**.

STRICT RULES:
1. The fact must be TRUE and VERIFIABLE — no fiction, no exaggeration.
2. Make it SURPRISING — not something everyone knows.
3. 2-3 sentences MAX. Short and punchy.
4. Include specific numbers, names, or comparisons.
5. Start with a relevant emoji (🌟 🌌 🪐 ⭐ 🌠 🕳️ 💫 🌍 🛰️ ⚡).
6. NO intro like "Here's a fact" — say the fact directly.
7. Language: English only.
8. Random seed for uniqueness: ${seed}

Return ONLY the fact text. Nothing else.`;
}

function getMixPrompt(submode, localTitles) {
  const seed = Date.now() + Math.random();
  const type = submode === 'movie' ? 'movies' : 'items (movies, games, books, music)';

  return `You are Nexus AI recommending ${type} from the internet.

USER WANTS: ${submode === 'movie' ? 'a movie to watch' : 'a random recommendation'}

LOCAL TITLES ALREADY ON NEXUS (do NOT recommend these): ${localTitles}

STRICT RULES:
1. Suggest EXACTLY 3 real, well-known ${type}.
2. Each must be DIFFERENT from the others — mix genres/eras/types.
3. Format EACH line EXACTLY like this:
[[ext:Title|Type|Why]]
   - Title: name of the item
   - Type: movie / game / book / music
   - Why: ONE short line reason (max 12 words)
4. NO intro, NO outro, NO bullet points, NO other text.
5. Random seed for variety: ${seed}
6. Don't repeat the same items across requests.

EXAMPLE OUTPUT (exactly 3 lines):
[[ext:Arrival|movie|Slow-burn sci-fi with emotional depth]]
[[ext:Disco Elysium|game|Detective RPG with incredible writing]]
[[ext:The Alchemist|book|Simple philosophy, light read]]

Now return ONLY 3 lines.`;
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
  if (mode === 'recommend') {
    systemPrompt = getRecommendSystemPrompt(mood || 'Anything good');
  } else if (mode === 'cosmic') {
    systemPrompt = getCosmicPrompt();
  } else if (mode === 'mix') {
    const localTitles = (body.localTitles || []).join(', ').substring(0, 500);
    systemPrompt = getMixPrompt(mood || 'random', localTitles);
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
          temperature: mode === 'chat' ? 0.7 : 0.9,
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