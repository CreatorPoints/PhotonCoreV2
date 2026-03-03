export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { modelId, messages, stream } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: "messages array is required"
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://your-domain.vercel.app",
                    "X-Title": "Photon Core"
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages,
                    stream: !!stream
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).send(errText);
        }

        // STREAMING MODE
        if (stream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                res.write(chunk);
            }

            return res.end();
        }

        // NORMAL MODE
        const data = await response.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
