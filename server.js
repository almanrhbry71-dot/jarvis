// Jarvis local server
// Serves jarvis.html as a normal webpage (so the microphone permission
// prompt works) and proxies chat requests to Groq's free API using your
// own API key (so the chat never gets blocked by CORS/auth, and it's free).

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'متغیر محیطی GROQ_API_KEY تنظیم نشده است. راهنمای README.md را ببینید.' }
    });
  }

  try {
    const { system, messages } = req.body;
    const groqMessages = [
      { role: 'system', content: system || '' },
      ...(messages || []).map(m => ({ role: m.role, content: m.content }))
    ];

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 1000
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: { message: data?.error?.message || `خطای گروک (${upstream.status})` }
      });
    }

    const text = data?.choices?.[0]?.message?.content || '';
    // reshape into the format jarvis.html already expects
    res.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis is running: http://localhost:${PORT}/jarvis.html`);
});
