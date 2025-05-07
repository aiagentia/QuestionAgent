const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/ask', async (req, res) => {
  try {
    const question = req.body.question;

    const response = await fetch('YOUR_N8N_WEBHOOK_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { question }
      })
    });

    const data = await response.json();

    const answer = Array.isArray(data) && data[0]?.Answer
      ? data[0].Answer.trim()
      : null;

    const image = Array.isArray(data) && data[0]?.Image
      ? data[0].Image
      : null;

    res.json({
      success: true,
      answer: answer,
      image: image,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
