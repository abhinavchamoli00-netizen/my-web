// In-memory cache to prevent duplicate feedback
const recentFeedback = new Map();

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

  const name = (body && body.name) || '';
  const message = (body && body.message) || '';

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Prevent duplicate: same message within 10 seconds
  const cacheKey = `${name}_${message}`.substring(0, 100);
  const now = Date.now();
  const lastFeedback = recentFeedback.get(cacheKey);

  if (lastFeedback && (now - lastFeedback) < 10000) {
    return res.status(200).json({ success: true, skipped: 'duplicate' });
  }
  recentFeedback.set(cacheKey, now);

  // Clean old entries
  if (recentFeedback.size > 100) {
    for (const [key, time] of recentFeedback) {
      if (now - time > 60000) recentFeedback.delete(key);
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Config missing' });
  }

  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `📩 New Feedback from Nexus\n\n👤 Name: ${name || 'Anonymous'}\n\n💬 Message:\n${message}\n\n🕐 Time: ${dateStr}`;

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