module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.JSONBIN_API_KEY || process.env.JSONBIN_KEY;
  const pollBinId = process.env.POLL_BIN_ID;
  if (!apiKey || !pollBinId) {
    return res.status(200).json({ success: true, pinned: [] });
  }

  try {
    const url = `https://api.jsonbin.io/v3/b/${pollBinId}/latest`;
    const r = await fetch(url, { headers: { 'X-Master-Key': apiKey } });
    const d = await r.json();
    const data = (d.record && typeof d.record === 'object') ? d.record : {};
    const pinned = Array.isArray(data.pinned) ? data.pinned : [];
    return res.status(200).json({ success: true, pinned });
  } catch (e) {
    return res.status(200).json({ success: true, pinned: [] });
  }
};