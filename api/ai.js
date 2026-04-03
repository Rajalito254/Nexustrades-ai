// api/ai.js — Vercel Serverless API using Google Gemini (FREE TIER)
// Supports both text analysis and image analysis (1,500 requests/day free)

export default async function handler(req, res) {
  // CORS headers
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
      // Simple text prompt
      textContent = msgContent;
    } else if (Array.isArray(msgContent)) {
      // Multimodal prompt (text + image)
      msgContent.forEach(item => {
        if (item.type === 'text') textContent = item.text;
        if (item.type === 'image') {
          imageData = item.source?.data;
          imageMime = item.source?.media_type || 'image/jpeg';
        }
      });
    }

    // Build Gemini request parts
    const parts = [{ text: textContent }];
    
    // Add image if present
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: imageMime,
          data: imageData
        }
      });
    }

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { 
            maxOutputTokens: max_tokens, 
            temperature: 0.7 
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Format response to match Anthropic's structure for compatibility
    return res.status(200).json({
      content: [{ text }],
      model: 'gemini-1.5-flash',
      usage: data.usageMetadata,
    });

  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({ 
      error: { 
        message: error.message || 'Internal server error' 
      } 
    });
  }
}
