import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageBase64, mimeType, userId } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  // Connect to Cloudflare R2
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY,
    }
  });

  try {
    // Strip the Base64 header and convert to binary buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create a unique filename
    const fileExtension = mimeType.split('/')[1] || 'jpg';
    const fileName = `avatars/${userId}-${Date.now()}.${fileExtension}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
    }));

    // Return your public R2 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    res.status(200).json({ url: publicUrl });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
