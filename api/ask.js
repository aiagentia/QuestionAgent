// File: pages/api/ask.js (or your equivalent API route file)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { question } = req.body;

  // Basic validation for the incoming question
  if (!question || typeof question !== 'string' || question.trim() === "") {
    return res.status(400).json({ success: false, message: 'Question is required and must be a non-empty string.' });
  }

  try {
    // This is the URL of your n8n webhook that processes the question
    // Make sure this is the correct URL for your n8n "Webhook - Search" node's production URL
    const n8nWebhookUrl = 'https://n8n-c4yc.onrender.com/webhook/search-question'; // <<<<< CHECK AND CONFIRM THIS URL

    // This is the fetch request TO your n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The body structure here MUST match what your n8n webhook TRIGGER node expects.
      // If your n8n Webhook node expects `{"question": "your question"}`, use this:
      body: JSON.stringify({ question: question.trim() }),
      // If your n8n Webhook node expects `{"data": {"question": "your question"}}`, use this:
      // body: JSON.stringify({ data: { question: question.trim() } }), 
    });

    // Check if the call to n8n itself was successful
    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.text(); // Get more details from n8n error
      console.error(`Error from n8n webhook (${n8nWebhookUrl}). Status: ${n8nResponse.status}. Body: ${errorBody}`);
      return res.status(502).json({ success: false, message: 'Error communicating with the backend AI service. Please check server logs.' });
    }

    // Parse the JSON response FROM n8n
    const dataFromN8N = await n8nResponse.json();

    // ---- IMPORTANT: Log what's actually received from n8n ----
    console.log("Next.js API (/api/ask) - Data received from n8n:", JSON.stringify(dataFromN8N, null, 2));

    let extractedAnswer = null;
    let extractedImage = null;

    // n8n Code node outputs an array, typically with one item: [{ json: { Answer: "...", Image: "..." } }]
    // So, we access dataFromN8N[0].json
    if (Array.isArray(dataFromN8N) && dataFromN8N.length > 0 && dataFromN8N[0] && typeof dataFromN8N[0].json === 'object' && dataFromN8N[0].json !== null) {
      const resultItemJson = dataFromN8N[0].json; // This is where Answer and Image are nested

      extractedAnswer = resultItemJson.Answer ? String(resultItemJson.Answer).trim() : "No answer text found in n8n response.";
      extractedImage = resultItemJson.Image || null; // This should be the direct Google Drive URL from n8n
    } else {
      console.warn("Next.js API (/api/ask) - Unexpected data format or empty array from n8n:", dataFromN8N);
      extractedAnswer = "Could not retrieve an answer due to an unexpected data format from the AI service.";
      // You might want to set success to false here if the format is critical
    }
    
    // ---- IMPORTANT: Log what this API route is about to send to the frontend ----
    console.log("Next.js API (/api/ask) - Sending to frontend: Answer:", extractedAnswer, "| Image:", extractedImage);

    return res.status(200).json({
      success: true, // Assuming success if we got this far, adjust if needed based on n8n response
      answer: extractedAnswer,
      image: extractedImage,
    });

  } catch (error) {
    console.error("Next.js API (/api/ask) - Critical error in handler:", error);
    return res.status(500).json({ success: false, message: 'Internal server error processing your request.' });
  }
}
