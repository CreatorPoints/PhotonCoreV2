import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const FILE_BUCKET = 'photon-files';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { id, storagePath } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'File ID required' });
        }

        // Delete from storage
        if (storagePath) {
            await supabase.storage
                .from(FILE_BUCKET)
                .remove([storagePath]);
        }

        // Delete metadata
        const { error } = await supabase
            .from('file_metadata')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ success: true });

    } catch (e) {
        console.error('Delete error:', e);
        res.status(500).json({ message: e.message });
    }
}