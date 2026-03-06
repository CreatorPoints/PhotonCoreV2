import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const FILE_BUCKET = 'photon-files';
const FILE_PATH = 'shared';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { name, content, uploadedBy, uploadedById } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'File name required' });
        }

        const blob = Buffer.from(content || '', 'utf-8');
        const timestamp = Date.now();
        const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${FILE_PATH}/${timestamp}_${sanitizedName}`;

        // Upload
        const { error: uploadError } = await supabase.storage
            .from(FILE_BUCKET)
            .upload(storagePath, blob, {
                contentType: 'text/plain',
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get URL
        const { data: urlData } = supabase.storage
            .from(FILE_BUCKET)
            .getPublicUrl(storagePath);

        // Save metadata
        const { error: dbError } = await supabase
            .from('file_metadata')
            .insert({
                name,
                storage_path: storagePath,
                size: blob.length,
                type: 'text/plain',
                download_url: urlData.publicUrl,
                uploaded_by: uploadedBy || 'AI',
                uploaded_by_id: uploadedById || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (dbError) throw dbError;

        res.status(200).json({
            success: true,
            size: blob.length,
            downloadURL: urlData.publicUrl
        });

    } catch (e) {
        console.error('Write error:', e);
        res.status(500).json({ message: e.message });
    }
}