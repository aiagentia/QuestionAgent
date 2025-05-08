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

    console.log("Next.js API (/api/ask) - RAW Data received from n8n:", JSON.stringify(dataFromN8N, null, 2));

    let extractedAnswer = null;
    let extractedImage = null;
    let dataFound = false;

    if (Array.isArray(dataFromN8N) && dataFromN8N.length > 0 && dataFromN8N[0] && typeof dataFromN8N[0].json === 'object' && dataFromN8N[0].json !== null) {
      console.log("Next.js API (/api/ask) - Processing n8n data as: Array of objects with 'json' key");
      const resultItemJson = dataFromN8N[0].json;
      extractedAnswer = resultItemJson.Answer?.trim() || null;
      extractedImage = resultItemJson.Image?.trim() || null;
      dataFound = true;
    } 
    else if (typeof dataFromN8N === 'object' && dataFromN8N !== null && typeof dataFromN8N.Answer !== 'undefined') {
      console.log("Next.js API (/api/ask) - Processing n8n data as: Direct object with Answer/Image keys");
      extractedAnswer = dataFromN8N.Answer?.trim() || null;
      extractedImage = dataFromN8N.Image?.trim() || null;
      dataFound = true;
    }
    else if (Array.isArray(dataFromN8N) && dataFromN8N.length > 0 && typeof dataFromN8N[0] === 'object' && dataFromN8N[0] !== null && typeof dataFromN8N[0].Answer !== 'undefined') {
      console.log("Next.js API (/api/ask) - Processing n8n data as: Array of direct Answer/Image objects");
      const firstItem = dataFromN8N[0];
      extractedAnswer = firstItem.Answer?.trim() || null;
      extractedImage = firstItem.Image?.trim() || null;
      dataFound = true;
    }

    // Check if the image URL is from Google Drive
    if (extractedImage && extractedImage.includes('drive.google.com')) {
      console.log("Next.js API (/api/ask) - Google Drive URL detected, attempting transformation.");
      const regex = /id=([a-zA-Z0-9_-]+)/;
      const match = extractedImage.match(regex);
      if (match && match[1]) {
        // Convert to a valid Google Drive image URL
        extractedImage = `https://drive.google.com/uc?export=view&id=${match[1]}`;
      } else {
        console.warn("Next.js API (/api/ask) - Google Drive ID extraction failed.");
      }
    }

    if (!dataFound) {
      console.warn("Next.js API (/api/ask) - Unexpected data format from n8n. RAW data logged above. Defaulting to error message.");
      extractedAnswer = "Could not retrieve an answer due to an unexpected data format from the AI service.";
    } else if (!extractedAnswer) {
      extractedAnswer = "Answer found, but content is empty.";
    }

    console.log("Next.js API (/api/ask) - Sending to frontend: Answer:", extractedAnswer, "| Image:", extractedImage);

    return res.status(200).json({
      success: dataFound && extractedAnswer !== "Could not retrieve an answer due to an unexpected data format from the AI service.",
      answer: extractedAnswer,
      image: extractedImage,
    });

  } catch (error) {
    console.error("Next.js API (/api/ask) - Critical error in handler:", error);

    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      console.error("Next.js API (/api/ask) - Error parsing JSON from n8n. n8n might have sent HTML or plain text (e.g. an error page).");
      return res.status(502).json({ success: false, message: 'Received invalid data from the backend AI service.' });
    }

    return res.status(500).json({ success: false, message: 'Internal server error processing your request.' });
  }
}
