// File: pages/api/search.js

export default async function handler(req, res) {
  console.log('Search API - Received request:', {
    method: req.method,
    // Removed req.body and req.headers from this top-level log for brevity in most cases
    // but they are good for deep debugging if needed.
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
    console.log('Search API - Request payload:', JSON.stringify({ keyword: keyword.trim() })); // Stringify for clearer log

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: keyword.trim() }),
    });

    console.log('Search API - n8n response status:', n8nResponse.status);
    // console.log('Search API - n8n response headers:', Object.fromEntries(n8nResponse.headers.entries())); // Uncomment if needed for debugging headers

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.text();
      console.error(`Error from n8n webhook (${n8nWebhookUrl}). Status: ${n8nResponse.status}. Body: ${errorBody}`);
      return res.status(502).json({ success: false, message: 'Error communicating with the search service.' });
    }

    const dataFromN8N = await n8nResponse.json();
    console.log("Search API - RAW Data received from n8n:", JSON.stringify(dataFromN8N, null, 2));

    let sourceArrayForResults = [];

    // Scenario 1: n8n wraps the array of results in its standard [ { json: ACTUAL_ARRAY_OF_RESULTS } ] structure.
    // This is very common for n8n workflows.
    if (Array.isArray(dataFromN8N) &&
        dataFromN8N.length > 0 &&
        dataFromN8N[0] &&
        typeof dataFromN8N[0] === 'object' && // Ensure the first item is an object
        dataFromN8N[0].json &&                // Ensure 'json' property exists
        Array.isArray(dataFromN8N[0].json)) { // Crucially, ensure 'json' property IS THE ARRAY of results
      console.log("Search API - n8n data is wrapped; extracting results array from dataFromN8N[0].json.");
      sourceArrayForResults = dataFromN8N[0].json;
    }
    // Scenario 2: n8n sends the array of results directly.
    // (e.g., dataFromN8N is already [ { question: ..., answer: ... }, ... ])
    // This also correctly handles if n8n returns an empty array [] directly.
    else if (Array.isArray(dataFromN8N)) {
      console.log("Search API - n8n data appears to be a direct array of results.");
      sourceArrayForResults = dataFromN8N;
    } else {
      console.warn("Search API - Unexpected data format from n8n. RAW data logged above. Expected an array or a wrapped array. Returning empty results.");
      // sourceArrayForResults will remain [], leading to "No results found" on the frontend.
    }

    // Ensure sourceArrayForResults is definitely an array before mapping.
    // This guards against cases where dataFromN8N[0].json might have existed but wasn't an array.
    if (!Array.isArray(sourceArrayForResults)) {
        console.warn("Search API - Extracted source for results (sourceArrayForResults) is not an array. Defaulting to empty. Value:", JSON.stringify(sourceArrayForResults));
        sourceArrayForResults = [];
    }

    // Map the extracted results to the structure expected by the frontend.
    // Your n8n example shows lowercase keys 'question', 'answer', 'image'.
    const results = sourceArrayForResults.map(item => {
      // Defensive check: ensure item is a non-null object before accessing properties.
      if (typeof item === 'object' && item !== null) {
        return {
          question: item.question || '', // Default to empty string if property is missing or falsy
          answer: item.answer || '',   // Default to empty string
          image: item.image || null    // Default to null
        };
      }
      // If an item in the source array isn't a proper object, log a warning and return a placeholder.
      // This prevents the map operation from failing if the array contains unexpected elements.
      console.warn("Search API - Item in results array is not a valid object:", JSON.stringify(item));
      return { question: '', answer: 'Error: Invalid item format received', image: null };
    });

    console.log('Search API - Processed results to be sent to frontend:', JSON.stringify(results, null, 2));
    return res.status(200).json(results);

  } catch (error) {
    console.error("Search API - Critical error in handler:", error);
    // The error.stack can be very helpful for SyntaxError or other unexpected issues.
    if (error.stack) {
        console.error("Search API - Error stack:", error.stack);
    }

    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      console.error("Search API - Error parsing JSON from n8n. n8n might have sent HTML (e.g., an error page) or malformed JSON.");
      return res.status(502).json({ success: false, message: 'Received invalid data structure from the search service.' });
    }

    return res.status(500).json({ success: false, message: 'Internal server error processing your search request.' });
  }
}
