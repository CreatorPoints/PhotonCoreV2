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
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing env vars');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { fileData, fileName, fileType, uploadedBy, uploadedById } = req.body;

        if (!fileData || !fileName) {
            return res.status(400).json({ error: 'Missing file data or name' });
        }

        // Convert base64 to buffer
        let base64Data = fileData;
        if (fileData.includes(',')) {
            base64Data = fileData.split(',')[1];
        }
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique path
        const timestamp = Date.now();
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = FILE_PATH + '/' + timestamp + '_' + sanitizedName;

        console.log('Uploading:', storagePath, 'Size:', buffer.length);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(FILE_BUCKET)
            .upload(storagePath, buffer, {
                contentType: fileType || 'application/octet-stream',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Storage error:', uploadError);
            return res.status(500).json({ error: uploadError.message });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(FILE_BUCKET)
            .getPublicUrl(storagePath);

        const downloadURL = urlData ? urlData.publicUrl : '';

        console.log('Uploaded, URL:', downloadURL);

        // Save metadata
        const { data: dbData, error: dbError } = await supabase
            .from('file_metadata')
            .insert({
                name: fileName,
                storage_path: storagePath,
                size: buffer.length,
                type: fileType || 'application/octet-stream',
                download_url: downloadURL,
                uploaded_by: uploadedBy || 'Unknown',
                uploaded_by_id: uploadedById || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.error('DB error:', dbError);
            // Cleanup uploaded file
            await supabase.storage.from(FILE_BUCKET).remove([storagePath]);
            return res.status(500).json({ error: dbError.message });
        }

        return res.status(200).json({
            success: true,
            downloadURL: downloadURL,
            name: fileName,
            id: dbData ? dbData.id : null
        });

    } catch (e) {
        console.error('Upload error:', e);
        return res.status(500).json({ error: e.message || 'Upload failed' });
    }
};

// Config for body size
module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};