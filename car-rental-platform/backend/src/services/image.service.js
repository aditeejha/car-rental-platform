const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuid } = require('uuid');
const config = require('../config');
const { pool } = require('../db/pool');
const { badRequest } = require('../utils/errors');

const s3 = config.aws.bucket
  ? new S3Client({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey }
        : undefined,
    })
  : null;

// Issue a presigned URL the client can PUT to directly.
// If S3 is not configured, fall back to a signed mock URL.
async function presignUpload({ contentType, prefix = 'trip' }) {
  const key = `${prefix}/${Date.now()}-${uuid()}`;
  if (!s3) {
    return {
      provider: 'mock',
      key,
      uploadUrl: null,
      publicUrl: `https://placehold.co/1200x800?text=${encodeURIComponent('Pending sync ' + key)}`,
    };
  }
  const cmd = new PutObjectCommand({
    Bucket: config.aws.bucket, Key: key, ContentType: contentType || 'image/jpeg',
  });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
  return {
    provider: 's3',
    key,
    uploadUrl,
    publicUrl: `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`,
  };
}

// Persist a trip image record after the client has uploaded the bytes
// (or while offline — the URL can be a queued upload reference).
async function attachTripImage({ bookingId, uploaderId, phase, angle, imageUrl, capturedAt, lat, lng, hash, meta }) {
  if (!['pre', 'post'].includes(phase)) throw badRequest('phase must be pre|post');
  const { rows } = await pool.query(
    `INSERT INTO trip_images
       (booking_id, uploader_id, phase, angle, image_url, captured_at, lat, lng, hash, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
     RETURNING id, booking_id, phase, angle, image_url, captured_at, uploaded_at`,
    [bookingId, uploaderId, phase, angle, imageUrl, capturedAt, lat || null, lng || null, hash || null, JSON.stringify(meta || {})]
  );
  return rows[0];
}

async function listForBooking(bookingId) {
  const { rows } = await pool.query(
    `SELECT id, phase, angle, image_url, captured_at, uploaded_at, lat, lng
       FROM trip_images WHERE booking_id=$1 ORDER BY uploaded_at ASC`,
    [bookingId]
  );
  return rows;
}

module.exports = { presignUpload, attachTripImage, listForBooking };
