// api/verify-secret.js
export default function handler(req, res) {
    // CORS headers
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
        const { secret } = req.body;

        if (!secret) {
            return res.status(400).json({ error: 'Secret required', valid: false });
        }

        const correctSecret = process.env.SECRET_KEY;

        if (!correctSecret) {
            console.error('SECRET_KEY not configured in environment');
            return res.status(500).json({ error: 'Server configuration error', valid: false });
        }

        // Compare secrets (case-sensitive)
        const isValid = secret === correctSecret;

        return res.status(200).json({ valid: isValid });
    } catch (error) {
        console.error('Verify secret error:', error);
        return res.status(500).json({ error: 'Server error', valid: false });
    }
}
