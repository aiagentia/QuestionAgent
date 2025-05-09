// File: pages/api/search.js

export default async function handler(req, res) {
  console.log('Search API - Received request:', {
    method: req.method,
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { keyword } = req.body;

  if (!keyword || typeof keyword !== 'string' || keyword.trim() === "") {
    return res.status(400).json({ success: false, message: 'Keyword is required and must be a non-empty string.' });
  }

  try {
    const n8nWebhookUrl = 'https://n8n-c4yc.onrender.com/webhook/keyword-search'; // Ensure this is your correct keyword search webhook
    console.log('Search API - Sending request to n8n webhook:', n8nWebhookUrl);
    console.log('Search API - Request payload:', JSON.stringify({ keyword: keyword.trim() }));

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: keyword.trim() }),
    });

    console.log('Search API - n8n response status:', n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.text();
      console.error(`Error from n8n webhook (${n8nWebhookUrl}). Status: ${n8nResponse.status}. Body: ${errorBody}`);
      return res.status(502).json({ success: false, message: 'Error communicating with the search service.' });
    }

    const dataFromN8N = await n8nResponse.json();
    console.log("Search API - RAW Data received from n8n:", JSON.stringify(dataFromN8N, null, 2));

    let resultsToProcess = []; // This will hold the array of items to map

    // Scenario 1: n8n wraps an array of results in its standard [ { json: ACTUAL_ARRAY_OF_RESULTS } ] structure.
    if (Array.isArray(dataFromN8N) &&
        dataFromN8N.length > 0 &&
        dataFromN8N[0] &&
        typeof dataFromN8N[0] === 'object' && dataFromN8N[0] !== null && // Ensure dataFromN8N[0] is an object
        dataFromN8N[0].json &&
        Array.isArray(dataFromN8N[0].json)) {
      console.log("Search API - n8n data is wrapped; extracting results array from dataFromN8N[0].json.");
      resultsToProcess = dataFromN8N[0].json;
    }
    // Scenario 2: n8n sends an array of results directly. (YOUR CURRENT CASE)
    else if (Array.isArray(dataFromN8N)) {
      console.log("Search API - n8n data appears to be a direct array of results.");
      resultsToProcess = dataFromN8N; // This should assign your array of 3 items
    }
    // Scenario 3: n8n sends a single object directly
    else if (typeof dataFromN8N === 'object' && dataFromN8N !== null && !Array.isArray(dataFromN8N)) {
      console.log("Search API - n8n data is a single object. Wrapping it in an array.");
      if (Object.keys(dataFromN8N).length === 0) {
          console.log("Search API - Single object from n8n is empty. Treating as no results.");
          resultsToProcess = [];
      } else {
          resultsToProcess = [dataFromN8N]; // Wrap the single object in an array
      }
    }
    // Scenario 4: Unexpected format or empty response
    else {
      console.warn("Search API - Unexpected data format from n8n or empty response. RAW data logged above. Defaulting to empty results.");
      resultsToProcess = [];
    }

    if (!Array.isArray(resultsToProcess)) { // Defensive check
        console.warn("Search API - Extracted source for results (resultsToProcess) is not an array after initial checks. Defaulting to empty. Value:", JSON.stringify(resultsToProcess));
        resultsToProcess = [];
    }

    const results = resultsToProcess.map(item => {
      if (typeof item === 'object' && item !== null) {
        return {
          question: item.question || '',
          answer: item.answer || '',
          image: item.image || null
        };
      }
      console.warn("Search API - Item in results array is not a valid object:", JSON.stringify(item));
      return { question: '', answer: 'Error: Invalid item format received', image: null };
    });

    console.log('Search API - Processed results to be sent to frontend:', JSON.stringify(results, null, 2));
    return res.status(200).json(results); // This should send the full array of results

  } catch (error) {
    console.error("Search API - Critical error in handler:", error);
    if (error.stack) {
        console.error("Search API - Error stack:", error.stack);
    }
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      console.error("Search API - Error parsing JSON from n8n. n8n might have sent HTML or malformed JSON.");
      return res.status(502).json({ success: false, message: 'Received invalid data structure from the search service.' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error processing your search request.' });
  }
}
