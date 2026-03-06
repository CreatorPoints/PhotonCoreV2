import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const FILE_BUCKET = 'photon-files';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { id, name } = req.query;

        let metadata;
        
        if (id) {
            const { data, error } = await supabase
                .from('file_metadata')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            metadata = data;
        } else if (name) {
            const { data, error } = await supabase
                .from('file_metadata')
                .select('*')
                .ilike('name', `%${name}%`)
                .limit(1)
                .single();
            if (error) throw error;
            metadata = data;
        } else {
            return res.status(400).json({ message: 'ID or name required' });
        }

        if (!metadata) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check if text file
        const textExtensions = /\.(txt|js|ts|py|html|css|json|md|csv|xml|yaml|yml|log|sh|gd|cs|cpp|c|h)$/i;
        const isText = textExtensions.test(metadata.name) || metadata.type?.startsWith('text/');

        if (!isText) {
            return res.status(200).json({
                name: metadata.name,
                size: metadata.size,
                isBinary: true
            });
        }

        // Download content
        const { data: fileData, error: storageError } = await supabase.storage
            .from(FILE_BUCKET)
            .download(metadata.storage_path);

        if (storageError) throw storageError;

        const content = await fileData.text();

        res.status(200).json({
            name: metadata.name,
            size: metadata.size,
            content,
            isBinary: false
        });

    } catch (e) {
        console.error('Read error:', e);
        res.status(500).json({ message: e.message });
    }
}