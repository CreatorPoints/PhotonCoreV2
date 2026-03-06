import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: { bodyParser: false }
};

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
        const form = formidable({ maxFileSize: 50 * 1024 * 1024 });
        
        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve([fields, files]);
            });
        });

        const file = files.file?.[0] || files.file;
        if (!file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        const fileName = fields.fileName?.[0] || fields.fileName || file.originalFilename;
        const uploadedBy = fields.uploadedBy?.[0] || fields.uploadedBy || 'Unknown';
        const uploadedById = fields.uploadedById?.[0] || fields.uploadedById || '';

        // Read file
        const fileBuffer = fs.readFileSync(file.filepath);
        
        // Generate unique path
        const timestamp = Date.now();
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${FILE_PATH}/${timestamp}_${sanitizedName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(FILE_BUCKET)
            .upload(storagePath, fileBuffer, {
                contentType: file.mimetype || 'application/octet-stream',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(FILE_BUCKET)
            .getPublicUrl(storagePath);

        // Save metadata
        const { error: dbError } = await supabase
            .from('file_metadata')
            .insert({
                name: fileName,
                storage_path: storagePath,
                size: file.size,
                type: file.mimetype || 'application/octet-stream',
                download_url: urlData.publicUrl,
                uploaded_by: uploadedBy,
                uploaded_by_id: uploadedById,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (dbError) throw dbError;

        // Cleanup temp file
        fs.unlinkSync(file.filepath);

        res.status(200).json({
            success: true,
            downloadURL: urlData.publicUrl,
            name: fileName
        });

    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ message: e.message });
    }
}