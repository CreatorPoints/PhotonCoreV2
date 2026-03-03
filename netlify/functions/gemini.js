export async function handler(event) {
  try {
    const { messages, modelId, stream } = JSON.parse(event.body);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://your-site.vercel.app", // change later
          "X-Title": "Photon Core"
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: !!stream
        })
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { statusCode: response.status, body: text };
    }

    // STREAM MODE
    if (stream) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        },
        body: response.body
      };
    }

    // NORMAL MODE
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
