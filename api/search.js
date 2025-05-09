export default async function handler(req, res) {
  console.log('Search API - Received request:', {
    method: req.method,
    body: req.body,
    headers: req.headers
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { keyword } = req.body;

  if (!keyword || typeof keyword !== 'string' || keyword.trim() === "") {
    return res.status(400).json({ success: false, message: 'Keyword is required and must be a non-empty string.' });
  }

  try {
    const n8nWebhookUrl = 'https://n8n-c4yc.onrender.com/webhook/keyword-search';
    console.log('Search API - Sending request to n8n webhook:', n8nWebhookUrl);
    console.log('Search API - Request payload:', { keyword: keyword.trim() });

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: keyword.trim() }),
    });

    console.log('Search API - n8n response status:', n8nResponse.status);
    console.log('Search API - n8n response headers:', Object.fromEntries(n8nResponse.headers.entries()));

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.text();
      console.error(`Error from n8n webhook (${n8nWebhookUrl}). Status: ${n8nResponse.status}. Body: ${errorBody}`);
      return res.status(502).json({ success: false, message: 'Error communicating with the search service.' });
    }

    const dataFromN8N = await n8nResponse.json();
    console.log("Search API - RAW Data received from n8n:", JSON.stringify(dataFromN8N, null, 2));

    // Map the results for the frontend
    let results = [];
    if (Array.isArray(dataFromN8N)) {
      results = dataFromN8N.map(item => ({
        question: item.question,
        answer: item.answer,
        image: item.image
      }));
    }

    console.log('Search API - Processed results:', results);
    return res.status(200).json(results);

  } catch (error) {
    console.error("Search API - Critical error in handler:", error);
    console.error("Search API - Error stack:", error.stack);

    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      console.error("Search API - Error parsing JSON from n8n. n8n might have sent HTML or plain text (e.g. an error page).");
      return res.status(502).json({ success: false, message: 'Received invalid data from the search service.' });
    }

    return res.status(500).json({ success: false, message: 'Internal server error processing your request.' });
  }
} 
