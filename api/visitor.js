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
  if (!body || typeof body !== 'object') body = {};

  const type = body.type || 'pageView';
  const deviceToken = body.deviceToken || '';
  const TRUSTED_TOKEN = process.env.MY_DEVICE_TOKEN || '';
  const isTrusted = !!(TRUSTED_TOKEN && deviceToken === TRUSTED_TOKEN);

  // Skip if owner's device
  if (isTrusted) return res.status(200).json({ success: true, skipped: true });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return res.status(200).json({ success: true });

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';
  const ua = req.headers['user-agent'] || '';

  // Detect referrer source
  const referrer = body.referrer || 'Direct';
  const detectSource = (ref) => {
    if (!ref || ref === 'Direct') return 'Direct';
    const r = ref.toLowerCase();
    if (r.includes('instagram')) return 'Instagram';
    if (r.includes('facebook')) return 'Facebook';
    if (r.includes('twitter') || r.includes('x.com') || r.includes('t.co')) return 'Twitter/X';
    if (r.includes('google')) return 'Google';
    if (r.includes('whatsapp')) return 'WhatsApp';
    if (r.includes('telegram') || r.includes('t.me')) return 'Telegram';
    if (r.includes('linkedin')) return 'LinkedIn';
    if (r.includes('reddit')) return 'Reddit';
    return 'Other';
  };

  const lookupLocation = async (ip) => {
    try {
      if (!ip || ip === 'Unknown') return 'Unknown';
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,countryCode`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        return `${geoData.city}, ${geoData.regionName}, ${geoData.countryCode}`;
      }
    } catch (e) {}
    return 'Unknown';
  };

  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  let text = '';

  if (type === 'firstVisit') {
    const location = await lookupLocation(clientIp);
    const source = detectSource(referrer);
    text = `🆕 *New Visitor*\n\n🌍 ${location}\n📱 ${body.device || 'Unknown'} • ${body.browser || 'Unknown'}${body.model ? ' • ' + body.model : ''}\n🌐 IP: \`${clientIp}\`\n🔗 Source: ${source}\n📄 Page: ${body.page || '/'}\n🕐 ${time}`;
  } else if (type === 'pageView') {
    const source = detectSource(referrer);
    text = `👀 *Page View*\n\n📄 ${body.page || '/'}\n🌍 Source: ${source}\n📱 ${body.device || 'Unknown'} • ${body.browser || 'Unknown'}\n🕐 ${time}`;
  } else if (type === 'socialClick') {
    text = `🔗 *Social Link Click*\n\n🎯 ${body.socialName || 'Unknown'}\n🔗 ${body.socialUrl || ''}\n📄 Page: ${body.page || '/'}\n📱 ${body.device || 'Unknown'}\n🕐 ${time}`;
  } else {
    text = `📌 *Event: ${type}*\n\n${JSON.stringify(body).substring(0, 200)}\n🕐 ${time}`;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
  } catch (e) {}

  return res.status(200).json({ success: true });
};