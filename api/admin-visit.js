module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://nexus-project-alpha8.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return res.status(500).json({ error: 'Config missing' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';
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

  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `🚨 *Admin Panel Opened*\n\nSomeone reached the admin page!\n\n🌍 Location: ${location}\n💻 Device: ${device} (${browser})\n🔗 IP: ${ip}\n📄 From: ${referrer}\n🕐 Time: ${time}`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Telegram failed' });
  }
};