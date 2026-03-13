const { GoogleGenAI } = require("@google/genai");

function normalizeQueryContents(query) {
    if (!query) return [];

    if (Array.isArray(query) && query.length && query[0]?.parts) {
        return query;
    }

    if (Array.isArray(query)) {
        return query.map(item => ({
            role: item.role || 'user',
            parts: Array.isArray(item.parts) ? item.parts : [{ text: String(item.content ?? item.text ?? '') }]
        }));
    }

    return [{ role: 'user', parts: [{ text: String(query) }] }];
}

function coerceText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(coerceText).join('');
    if (typeof value === 'object') {
        if (value.text !== undefined) return coerceText(value.text);
        if (value.content !== undefined) return coerceText(value.content);
        if (Array.isArray(value.parts)) {
            return value.parts.map(part => coerceText(part?.text ?? part)).join('');
        }
        try {
            return JSON.stringify(value);
        } catch (e) {
            return '';
        }
    }
    return String(value);
}

function extractTextFromResponse(response) {
    if (!response) return '';
    if (typeof response.text === 'string') return response.text;
    if (response.text !== undefined) return coerceText(response.text);
    const parts = response.candidates?.[0]?.content?.parts || [];
    return parts.map(part => coerceText(part?.text ?? part)).join('');
}

function extractTextFromChunk(chunk) {
    if (!chunk) return '';
    if (typeof chunk.text === 'string') return chunk.text;
    if (chunk.text !== undefined) return coerceText(chunk.text);
    const parts = chunk.candidates?.[0]?.content?.parts || [];
    return parts.map(part => coerceText(part?.text ?? part)).join('');
}

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

        const body = req.body || {};
        const query = body.query || body.messages || body.contents;
        const stream = !!body.stream;
        const modelId = body.modelId || body.model || "gemini-2.5-flash";

        if (!query) {
            return res.status(400).json({ error: 'Missing query' });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Web search grounding tool
        const groundingTool = {
            googleSearch: {}
        };

        const config = { ...(body.config && typeof body.config === 'object' ? body.config : {}) };
        const tools = Array.isArray(config.tools) ? config.tools.slice() : [];
        tools.push(groundingTool);
        config.tools = tools;

        if (body.generationConfig && typeof body.generationConfig === 'object' && !config.generationConfig) {
            config.generationConfig = body.generationConfig;
        }

        if (body.safetySettings && typeof body.safetySettings === 'object' && !config.safetySettings) {
            config.safetySettings = body.safetySettings;
        }

        const contents = normalizeQueryContents(query);

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
                const text = extractTextFromChunk(chunk);
                if (text) {
                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            const response = await ai.models.generateContent({
                model: modelId,
                contents,
                config
            });

            const text = extractTextFromResponse(response) || '';

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
