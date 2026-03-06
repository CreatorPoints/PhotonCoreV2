const { createClient } = require('@supabase/supabase-js');

const FILE_BUCKET = 'photon-files';
const FILE_PATH = 'shared';

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

        const { name, content, uploadedBy, uploadedById } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'File name required' });
        }

        const buffer = Buffer.from(content || '', 'utf-8');
        const timestamp = Date.now();
        const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = FILE_PATH + '/' + timestamp + '_' + sanitizedName;

        // Upload
        const { error: uploadError } = await supabase.storage
            .from(FILE_BUCKET)
            .upload(storagePath, buffer, {
                contentType: 'text/plain',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Storage write error:', uploadError);
            return res.status(500).json({ error: uploadError.message });
        }

        // Get URL
        const { data: urlData } = supabase.storage
            .from(FILE_BUCKET)
            .getPublicUrl(storagePath);

        // Save metadata
        const { error: dbError } = await supabase
            .from('file_metadata')
            .insert({
                name: name,
                storage_path: storagePath,
                size: buffer.length,
                type: 'text/plain',
                download_url: urlData ? urlData.publicUrl : '',
                uploaded_by: uploadedBy || 'AI',
                uploaded_by_id: uploadedById || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('DB write error:', dbError);
            await supabase.storage.from(FILE_BUCKET).remove([storagePath]);
            return res.status(500).json({ error: dbError.message });
        }

        return res.status(200).json({
            success: true,
            size: buffer.length,
            downloadURL: urlData ? urlData.publicUrl : ''
        });

    } catch (e) {
        console.error('Write error:', e);
        return res.status(500).json({ error: e.message || 'Write failed' });
    }
};