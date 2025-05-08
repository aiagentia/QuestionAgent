  if (Array.isArray(dataFromN8N) && dataFromN8N.length > 0 && dataFromN8N[0] && typeof dataFromN8N[0].json === 'object' && dataFromN8N[0].json !== null) {
    console.log("Next.js API (/api/ask) - Processing n8n data as: Array of objects with 'json' key");
    const resultItemJson = dataFromN8N[0].json;
    extractedAnswer = resultItemJson.Answer?.replace(/\n/g, '').trim() || null;
    extractedImage = resultItemJson.Image?.replace(/\n/g, '').trim() || null;
    dataFound = true;
  } 
  else if (typeof dataFromN8N === 'object' && dataFromN8N !== null && typeof dataFromN8N.Answer !== 'undefined') {
    console.log("Next.js API (/api/ask) - Processing n8n data as: Direct object with Answer/Image keys");
    extractedAnswer = dataFromN8N.Answer?.replace(/\n/g, '').trim() || null;
    extractedImage = dataFromN8N.Image?.replace(/\n/g, '').trim() || null;
    dataFound = true;
  }
  else if (Array.isArray(dataFromN8N) && dataFromN8N.length > 0 && typeof dataFromN8N[0] === 'object' && dataFromN8N[0] !== null && typeof dataFromN8N[0].Answer !== 'undefined') {
    console.log("Next.js API (/api/ask) - Processing n8n data as: Array of direct Answer/Image objects");
    const firstItem = dataFromN8N[0];
    extractedAnswer = firstItem.Answer?.replace(/\n/g, '').trim() || null;
    extractedImage = firstItem.Image?.replace(/\n/g, '').trim() || null;
    dataFound = true;
  } 
