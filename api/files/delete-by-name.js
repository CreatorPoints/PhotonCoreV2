const { createClient } = require('@supabase/supabase-js');

const FILE_BUCKET = 'photon-files';

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
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'File name required' });
        }

        // Find file
        const { data: metadata, error: findError } = await supabase
            .from('file_metadata')
            .select('*')
            .ilike('name', '%' + name + '%')
            .limit(1)
            .single();

        if (findError || !metadata) {
            return res.status(404).json({ error: 'File not found: ' + name });
        }

        // Delete from storage
        if (metadata.storage_path) {
            await supabase.storage
                .from(FILE_BUCKET)
                .remove([metadata.storage_path]);
        }

        // Delete metadata
        const { error: dbError } = await supabase
            .from('file_metadata')
            .delete()
            .eq('id', metadata.id);

        if (dbError) {
            return res.status(500).json({ error: dbError.message });
        }

        return res.status(200).json({
            success: true,
            name: metadata.name
        });

    } catch (e) {
        console.error('Delete by name error:', e);
        return res.status(500).json({ error: e.message || 'Delete failed' });
    }
};