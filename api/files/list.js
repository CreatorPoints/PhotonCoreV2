import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { data, error } = await supabase
            .from('file_metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ files: data || [] });
    } catch (e) {
        console.error('List files error:', e);
        res.status(500).json({ message: e.message });
    }
}