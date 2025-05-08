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
      return res.status(502).json({ success: false, message: 'Error communicating with the backend AI service.' });
    }

    const dataFromN8N = await n8nResponse.json();

    let extractedAnswer = null;
    let extractedImage = null;

    if (dataFromN8N && dataFromN8N.Answer) {
      extractedAnswer = dataFromN8N.Answer.trim();
    }

    if (dataFromN8N && dataFromN8N.Image) {
      extractedImage = dataFromN8N.Image.trim();

      // Clean up the Google Drive URL to ensure it's embeddable
      if (extractedImage.includes('drive.google.com')) {
        const imageId = extractedImage.split('id=')[1].split('&')[0];
        extractedImage = `https://drive.google.com/uc?id=${imageId}`; // Embeddable image link
      }
    }

    // If no answer, provide a fallback message
    if (!extractedAnswer) {
      extractedAnswer = "Answer not found. Please try again.";
    }

    return res.status(200).json({
      success: true,
      answer: extractedAnswer,
      image: extractedImage || null,
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ success: false, message: 'Internal server error processing your request.' });
  }
}
