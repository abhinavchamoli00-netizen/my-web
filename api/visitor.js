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

  const type = (body && body.type) || 'firstVisit';
  const referrer = (body && body.referrer) || 'Direct';
  const page = (body && body.page) || 'index.html';
  const device = (body && body.device) || 'Unknown';
  const browser = (body && body.browser) || 'Other';
  const model = (body && body.model) || '';
  const platform = (body && body.platform) || '';

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';
  const ua = req.headers['user-agent'] || '';

  // ✅ Detect source from UA + referrer
  const detectSource = () => {
    // In-app browsers (more reliable than referrer)
    if (/Instagram/i.test(ua)) return 'Instagram (In-App Browser)';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook (In-App Browser)';
    if (/Twitter/i.test(ua)) return 'Twitter/X (In-App Browser)';
    if (/Snapchat/i.test(ua)) return 'Snapchat (In-App Browser)';
    if (/LinkedInApp|LinkedIn/i.test(ua)) return 'LinkedIn (In-App Browser)';

    // Referrer based
    if (!referrer || referrer === 'Direct') return 'Direct';
    if (/instagram\.com/i.test(referrer)) return 'Instagram';
    if (/t\.co|twitter\.com|x\.com/i.test(referrer)) return 'Twitter/X';
    if (/facebook\.com|fb\.com/i.test(referrer)) return 'Facebook';
    if (/google\./i.test(referrer)) return 'Google Search';
    if (/bing\.com/i.test(referrer)) return 'Bing Search';
    if (/youtube\.com|youtu\.be/i.test(referrer)) return 'YouTube';
    if (/whatsapp/i.test(referrer)) return 'WhatsApp';
    if (/telegram|t\.me/i.test(referrer)) return 'Telegram';
    if (/reddit\.com/i.test(referrer)) return 'Reddit';
    if (/linkedin\.com/i.test(referrer)) return 'LinkedIn';

    return 'Other';
  };

  const source = detectSource();

  // Rate limit — max 30 page views per minute per IP
  if (!global._visitorRate) global._visitorRate = new Map();
  const now = Date.now();
  const WINDOW = 60 * 1000;
  const MAX = 30;
  const rec = global._visitorRate.get(ip);
  if (!rec || now - rec.start > WINDOW) {
    global._visitorRate.set(ip, { start: now, count: 1 });
  } else {
    if (rec.count >= MAX) return res.status(429).json({ error: 'Too many' });
    rec.count++;
  }

  // Location lookup — sirf firstVisit pe
  let location = '';
  if (type === 'firstVisit' && ip !== 'Unknown') {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,countryCode`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = `${geoData.city}, ${geoData.regionName}, ${geoData.countryCode}`;
      }
    } catch (e) {}
  }

  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  let deviceStr = device + ' (' + browser + ')';
  if (model) {
    deviceStr = device + ' • ' + model + (platform ? ' • ' + platform : '');
  } else if (platform) {
    deviceStr = device + ' (' + browser + ') • ' + platform;
  }

  let text = '';
  if (type === 'firstVisit') {
    text = `👀 *New Visitor on Nexus*\n\n`
         + `🔗 *Source:* ${source}\n`
         + `🌍 Location: ${location || 'Unknown'}\n`
         + `💻 Device: ${deviceStr}\n`
         + `🌐 IP: \`${ip}\`\n`
         + `📄 Landing: ${page}\n`
         + `🕐 Time: ${time}`;
  } else if (type === 'pageView') {
    text = `📄 *Page View*\n\n`
         + `📄 Page: ${page}\n`
         + `🔗 Source: ${source}\n`
         + `💻 Device: ${deviceStr}\n`
         + `🌐 IP: \`${ip}\`\n`
         + `🕐 Time: ${time}`;
  } else {
    // fallback
    text = `👀 *New Visitor on Nexus*\n\n🔗 Source: ${source}\n🌍 Location: ${location || 'Unknown'}\n💻 Device: ${deviceStr}\n🌐 IP: \`${ip}\`\n📄 Page: ${page}\n🕐 Time: ${time}`;
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return res.status(500).json({ error: 'Config missing' });

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
    return res.status(200).json({ success: true, source });
  } catch (e) {
    return res.status(500).json({ error: 'Telegram failed' });
  }
};