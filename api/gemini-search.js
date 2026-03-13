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

        const { query, stream } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Missing query' });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Web search grounding tool
        const groundingTool = {
            googleSearch: {},
        };

        const config = {
            tools: [groundingTool],
        };

        if (stream) {
            // Streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash-preview-05-20",
                contents: query,
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
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-05-20",
                contents: query,
                config
            });

            const text = response.text || '';

            // Get grounding metadata if available
            let sources = [];
            try {
                const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
                if (groundingMetadata?.groundingChunks) {
                    sources = groundingMetadata.groundingChunks.map(chunk => ({
                        title: chunk.web?.title || 'Source',
                        url: chunk.web?.uri || ''
                    }));
                }
            } catch (e) {
                console.warn('Could not extract sources:', e);
            }

            return res.status(200).json({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: text
                    }
                }],
                sources
            });
        }

    } catch (e) {
        console.error('Gemini Search error:', e);
        return res.status(500).json({ error: e.message || 'Search failed' });
    }
};
