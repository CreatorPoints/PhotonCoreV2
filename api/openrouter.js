export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { messages, modelId, stream } = req.body;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://your-domain.vercel.app",
                "X-Title": "Photon Core"
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages.contents || [],
                stream: false
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).send(err);
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}