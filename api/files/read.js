import { createClient } from '@supabase/supabase-js';

const FILE_BUCKET = 'photon-files';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { id, name } = req.query;

        let metadata;

        if (id) {
            const { data, error } = await supabase
                .from('file_metadata')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                return res.status(404).json({ error: 'File not found' });
            }
            metadata = data;

        } else if (name) {
            const { data, error } = await supabase
                .from('file_metadata')
                .select('*')
                .ilike('name', `%${name}%`)
                .limit(1)
                .single();

            if (error || !data) {
                return res.status(404).json({ error: `File not found: ${name}` });
            }
            metadata = data;

        } else {
            return res.status(400).json({ error: 'ID or name required' });
        }

        // Check if text file
        const textExtensions = /\.(txt|js|ts|py|html|css|json|md|csv|xml|yaml|yml|log|sh|gd|cs|cpp|c|h)$/i;
        const isText = textExtensions.test(metadata.name) || (metadata.type && metadata.type.startsWith('text/'));

        if (!isText) {
            return res.status(200).json({
                name: metadata.name,
                size: metadata.size,
                isBinary: true
            });
        }

        // Download content from storage
        const { data: fileData, error: storageError } = await supabase.storage
            .from(FILE_BUCKET)
            .download(metadata.storage_path);

        if (storageError) {
            console.error('Storage read error:', storageError);
            return res.status(500).json({ error: 'Failed to read file content' });
        }

        const content = await fileData.text();

        return res.status(200).json({
            name: metadata.name,
            size: metadata.size,
            content: content,
            isBinary: false
        });

    } catch (e) {
        console.error('Read error:', e);
        return res.status(500).json({ error: e.message || 'Read failed' });
    }
}