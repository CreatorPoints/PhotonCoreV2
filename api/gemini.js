const { GoogleGenAI } = require("@google/genai");

function normalizeParts(content) {
    if (content === undefined || content === null) return [{ text: '' }];

    if (Array.isArray(content)) {
        return content.map(part => {
            if (typeof part === 'string') return { text: part };
            if (part && typeof part === 'object' && part.text) {
                return { text: String(part.text) };
            }
            return part;
        });
    }

    if (content && typeof content === 'object') {
        if (Array.isArray(content.parts)) return normalizeParts(content.parts);
        if (content.text) return [{ text: String(content.text) }];
    }

    return [{ text: String(content) }];
}

function normalizeContents(input) {
    if (!input) return [];

    if (Array.isArray(input) && input.length && input[0]?.parts) {
        return input
            .filter(m => m?.role !== 'system')
            .map(m => ({
                role: m.role || 'user',
                parts: normalizeParts(m.parts)
            }));
    }

    if (Array.isArray(input)) {
        return input
            .filter(Boolean)
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : (m.role || 'user'),
                parts: normalizeParts(m.content ?? m.parts ?? m.text)
            }));
    }

    if (typeof input === 'string') {
        return [{ role: 'user', parts: [{ text: input }] }];
    }

    return [{ role: 'user', parts: [{ text: String(input) }] }];
}

function normalizeSystemInstruction(input) {
    if (!input) return null;
    if (typeof input === 'string') return input;
    if (Array.isArray(input)) return { parts: normalizeParts(input) };
    if (input && typeof input === 'object' && Array.isArray(input.parts)) {
        return { parts: normalizeParts(input.parts) };
    }
    return String(input);
}

function extractTextFromResponse(response) {
    if (!response) return '';
    if (typeof response.text === 'string') return response.text;
    const parts = response.candidates?.[0]?.content?.parts || [];
    return parts.map(part => part.text || '').join('');
}

function extractTextFromChunk(chunk) {
    if (!chunk) return '';
    if (typeof chunk.text === 'string') return chunk.text;
    const parts = chunk.candidates?.[0]?.content?.parts || [];
    return parts.map(part => part.text || '').join('');
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
        const modelId = body.modelId || body.model;
        const messages = body.messages;
        const stream = !!body.stream;

        if (!modelId) {
            return res.status(400).json({ error: 'Missing modelId' });
        }

        if (!messages) {
            return res.status(400).json({ error: 'Missing messages' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemMessage = Array.isArray(messages)
            ? messages.find(m => m?.role === 'system')
            : null;

        const explicitSystem = normalizeSystemInstruction(body.systemInstruction);
        const systemInstruction = explicitSystem || normalizeSystemInstruction(systemMessage?.content ?? systemMessage?.parts ?? systemMessage?.text);
        const contents = normalizeContents(messages);

        const config = { ...(body.config && typeof body.config === 'object' ? body.config : {}) };

        if (body.generationConfig && typeof body.generationConfig === 'object' && !config.generationConfig) {
            config.generationConfig = body.generationConfig;
        }

        if (body.safetySettings && typeof body.safetySettings === 'object' && !config.safetySettings) {
            config.safetySettings = body.safetySettings;
        }

        if (body.tools && Array.isArray(body.tools) && !config.tools) {
            config.tools = body.tools;
        }

        const passthroughKeys = ['temperature', 'topP', 'topK', 'maxOutputTokens', 'responseMimeType'];
        passthroughKeys.forEach(key => {
            if (body[key] !== undefined && config[key] === undefined) {
                config[key] = body[key];
            }
        });

        if (systemInstruction && !config.systemInstruction) {
            config.systemInstruction = systemInstruction;
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
                const text = extractTextFromChunk(chunk);
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

            const text = extractTextFromResponse(response) || '';

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
