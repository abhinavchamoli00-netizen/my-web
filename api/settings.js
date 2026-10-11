module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.JSONBIN_API_KEY || process.env.JSONBIN_KEY;
  const binId = process.env.POLL_BIN_ID;
  if (!apiKey || !binId) return res.status(500).json({ error: 'Config missing' });

  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey }
    });
    const d = await r.json();
    const pinned = (d.record && Array.isArray(d.record.pinned)) ? d.record.pinned : [];
    return res.status(200).json({ success: true, pinned });
  } catch (e) {
    return res.status(500).json({ error: 'Failed' });
  }
};