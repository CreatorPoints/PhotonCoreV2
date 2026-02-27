export async function handler(event) {
  try {
    const { messages, modelId, stream } = JSON.parse(event.body);

    // choose correct endpoint (stream or non-stream)
    const endpoint = stream
      ? `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      const text = await response.text().catch(()=>'');
      return { statusCode: response.status, body: text };
    }

    if (stream) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive"
        },
        body: response.body
      };
    }

    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}