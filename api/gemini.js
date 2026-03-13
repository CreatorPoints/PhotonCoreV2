const { GoogleGenAI } = require("@google/genai");

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_KEY;

        if (!apiKey) {
            console.error('Missing GEMINI_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const { modelId, messages, stream } = req.body;

        if (!modelId || !messages) {
            return res.status(400).json({ error: 'Missing modelId or messages' });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Convert messages to Gemini format
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        // Build contents array
        const contents = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Config with system instruction
        const config = {};
        if (systemMessage) {
            config.systemInstruction = systemMessage.content;
        }

        if (stream) {
            // Streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const response = await ai.models.generateContentStream({
                model: modelId,
                contents,
                config
            });

            for await (const chunk of response) {
                const text = chunk.text;
                if (text) {
                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();

        } else {
            // Non-streaming response
            const response = await ai.models.generateContent({
                model: modelId,
                contents,
                config
            });

            const text = response.text || '';

            return res.status(200).json({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: text
                    }
                }]
            });
        }

    } catch (e) {
        console.error('Gemini API error:', e);
        return res.status(500).json({ error: e.message || 'Gemini API error' });
    }
};
