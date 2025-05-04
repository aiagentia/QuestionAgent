
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/ask', async (req, res) => {
  const question = req.body.question;

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    const webhookUrl = 'https://n8n-c4yc.onrender.com/webhook-test/search-question';
    const webhookData = {
      type: 'question_request',
      data: {
        question: question,
        source: 'web_interface',
        timestamp: new Date().toISOString()
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook error:', errorText);
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Webhook response:', data);
    
    // Handle array response with Answer property
    const answer = Array.isArray(data) && data[0]?.Answer 
      ? data[0].Answer.trim()
      : null;
    
    if (!answer) {
      throw new Error('No valid answer received from webhook');
    }
    
    res.json({
      success: true,
      answer: answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      error: "Failed to process request",
      message: error.message
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
