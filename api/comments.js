module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.JSONBIN_KEY;
  const binId = process.env.JSONBIN_ID;

  if (!apiKey || !binId) {
    return res.status(500).json({ 
      error: 'JSONBin config missing',
      hasKey: !!apiKey,
      hasBinId: !!binId
    });
  }

  const baseUrl = `https://api.jsonbin.io/v3/b/${binId}`;
  const headers = {
    'X-Master-Key': apiKey,
    'Content-Type': 'application/json'
  };

  // =====================
  // GET: Fetch all comments
  // =====================
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${baseUrl}/latest`, { headers });
      const data = await response.json();
      
      let comments = [];
      if (data.record && Array.isArray(data.record)) {
        comments = data.record;
      } else if (data.record && data.record.comments) {
        comments = data.record.comments;
      }
      
      comments = comments.slice(-50).reverse();
      return res.status(200).json({ success: true, comments });
    } catch (error) {
      return res.status(500).json({ error: 'Fetch failed', details: error.message });
    }
  }

  // =====================
  // POST: Add new comment
  // =====================
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    let name = (body && body.name) || '';
    const message = (body && body.message) || '';

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    name = name.trim() || 'Anonymous';
    if (name.length > 30) name = name.substring(0, 30);
    let cleanMessage = message.trim();
    if (cleanMessage.length > 300) cleanMessage = cleanMessage.substring(0, 300);

    try {
      const readRes = await fetch(`${baseUrl}/latest`, { headers });
      const readData = await readRes.json();
      
      let comments = [];
      if (readData.record && Array.isArray(readData.record)) {
        comments = readData.record;
      } else if (readData.record && readData.record.comments) {
        comments = readData.record.comments;
      }

      const newComment = {
        id: Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: name,
        message: cleanMessage,
        timestamp: Date.now()
      };

      comments.push(newComment);
      if (comments.length > 100) comments = comments.slice(-100);

      // Save as plain array (not wrapped in object)
      const saveRes = await fetch(baseUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(comments)
      });

      if (!saveRes.ok) {
        return res.status(500).json({ error: 'Save failed' });
      }

      return res.status(200).json({ success: true, comment: newComment });
    } catch (error) {
      return res.status(500).json({ error: 'Internal error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};