// api/ai.js - Using Google Gemini (FREE, supports images!)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, max_tokens = 1000 } = req.body;
    
    // Extract text and image from messages
    let textContent = '';
    let imageData = null;
    let imageMime = 'image/jpeg';
    
    const msgContent = messages[0]?.content;
    if (typeof msgContent === 'string') {
      textContent = msgContent;
    } else if (Array.isArray(msgContent)) {
      msgContent.forEach(item => {
        if (item.type === 'text') textContent = item.text;
        if (item.type === 'image') {
          imageData = item.source?.data;
          imageMime = item.source?.media_type || 'image/jpeg';
        }
      });
    }

    // Build Gemini request
    const parts = [{ text: textContent }];
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: imageMime,
          data: imageData
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Format to match Anthropic structure
    return res.status(200).json({
      content: [{ text }],
      model: 'gemini-1.5-flash',
    });

  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({ error: { message: error.message } });
  }
}
