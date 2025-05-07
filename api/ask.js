export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { question } = req.body;

  try {
    const response = await fetch('https://n8n-c4yc.onrender.com/webhook/search-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { question } }),
    });

    const data = await response.json();

    const answer = Array.isArray(data) && data[0]?.Answer
      ? data[0].Answer.trim()
      : null;

    const image = Array.isArray(data) && data[0]?.Image
      ? data[0].Image
      : null;

    return res.status(200).json({
      success: true,
      answer,
      image,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}
