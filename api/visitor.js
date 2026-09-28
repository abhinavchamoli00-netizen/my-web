const recentVisits = new Map();

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

  const referrer = (body && body.referrer) || 'Direct';
  const page = (body && body.page) || 'Unknown';
  const device = (body && body.device) || 'Unknown';
  const browser = (body && body.browser) || 'Unknown';

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             'Unknown';

  const cacheKey = `${ip}_${page}`;
  const now = Date.now();
  const lastVisit = recentVisits.get(cacheKey);

  if (lastVisit && (now - lastVisit) < 10000) {
    return res.status(200).json({ success: true, skipped: 'duplicate' });
  }
  recentVisits.set(cacheKey, now);

  if (recentVisits.size > 100) {
    for (const [key, time] of recentVisits) {
      if (now - time > 60000) recentVisits.delete(key);
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Config missing' });
  }

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

  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `👀 New Visitor on Nexus\n\n🔗 From: ${referrer}\n🌍 Location: ${location}\n💻 Device: ${device} (${browser})\n📄 Page: ${page}\n🕐 Time: ${dateStr}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
    const data = await response.json();
    if (!data.ok) return res.status(500).json({ error: 'Telegram failed' });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error' });
  }
};