// api/ai.js - Vercel Serverless Function using Groq (FREE)
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, max_tokens = 1000 } = req.body;

    // Call Groq API (FREE tier - no credit card needed)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // or 'mixtral-8x7b-32768', 'llama3-70b-8192'
        messages: messages,
        max_tokens: max_tokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await response.json();
    
    // Format response to match Anthropic's structure for compatibility
    const formattedResponse = {
      content: [{ text: data.choices[0].message.content }],
      model: data.model,
      usage: data.usage,
    };

    return res.status(200).json(formattedResponse);

  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({ 
      error: { 
        message: error.message || 'Internal server error' 
      } 
    });
  }
}
