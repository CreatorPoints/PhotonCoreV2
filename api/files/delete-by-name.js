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
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'File name required' });
        }

        // Find file
        const { data: metadata, error: findError } = await supabase
            .from('file_metadata')
            .select('*')
            .ilike('name', `%${name}%`)
            .limit(1)
            .single();

        if (findError || !metadata) {
            return res.status(404).json({ message: `File not found: ${name}` });
        }

        // Delete from storage
        if (metadata.storage_path) {
            await supabase.storage
                .from(FILE_BUCKET)
                .remove([metadata.storage_path]);
        }

        // Delete metadata
        const { error } = await supabase
            .from('file_metadata')
            .delete()
            .eq('id', metadata.id);

        if (error) throw error;

        res.status(200).json({
            success: true,
            name: metadata.name
        });

    } catch (e) {
        console.error('Delete error:', e);
        res.status(500).json({ message: e.message });
    }
}