// File: pages/api/ask.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { question } = req.body;

  if (!question || typeof question !== 'string' || question.trim() === "") {
    return res.status(400).json({ success: false, message: 'Question is required and must be a non-empty string.' });
  }

  try {
    const n8nWebhookUrl = 'https://n8n-c4yc.onrender.com/webhook/search-question'; // Ensure this is correct

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.trim() }),
    });

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.text();
      console.error(`Error from n8n webhook (${n8nWebhookUrl}). Status: ${n8nResponse.status}. Body: ${errorBody}`);
      return res.status(502).json({ success: false, message: 'Error communicating with the backend AI service.' });
    }

    const dataFromN8N = await n8nResponse.json();

    let extractedAnswer = null;
    let extractedImage = null;
    let dataFound = false;

    // Process the data from n8n response
    if (Array.isArray(dataFromN8N) && dataFromN8N.length > 0 && dataFromN8N[0].json) {
      const resultItemJson = dataFromN8N[0].json;
      extractedAnswer = resultItemJson.Answer?.trim() || null;
      extractedImage = resultItemJson.Image?.trim() || null;
      dataFound = true;
    } else {
      extractedAnswer = "Could not retrieve an answer.";
    }

    if (extractedImage && extractedImage.includes("drive.google.com")) {
      // Convert the Google Drive URL to an embeddable URL
      const imageId = extractedImage.split('id=')[1].split('&')[0];
      extractedImage = `https://drive.google.com/uc?id=${imageId}`;
    }

    return res.status(200).json({
      success: dataFound,
      answer: extractedAnswer,
      image: extractedImage,
    });

  } catch (error) {
    console.error("Error in /api/ask:", error);
    return res.status(500).json({ success: false, message: 'Internal server error processing your request.' });
  }
}
