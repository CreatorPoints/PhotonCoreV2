import { createClient } from '@supabase/supabase-js';

const FILE_BUCKET = 'photon-files';

export default async function handler(req, res) {
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
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { id, storagePath } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'File ID required' });
        }

        // Delete from storage
        if (storagePath) {
            const { error: storageError } = await supabase.storage
                .from(FILE_BUCKET)
                .remove([storagePath]);

            if (storageError) {
                console.warn('Storage delete warning:', storageError);
            }
        }

        // Delete metadata
        const { error: dbError } = await supabase
            .from('file_metadata')
            .delete()
            .eq('id', id);

        if (dbError) {
            console.error('Database delete error:', dbError);
            return res.status(500).json({ error: dbError.message });
        }

        return res.status(200).json({ success: true });

    } catch (e) {
        console.error('Delete error:', e);
        return res.status(500).json({ error: e.message || 'Delete failed' });
    }
}