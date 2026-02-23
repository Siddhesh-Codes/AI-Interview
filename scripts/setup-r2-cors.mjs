// ============================================================
// One-time Script: Configure CORS on Cloudflare R2 Bucket
// Run: node --env-file=.env.local scripts/setup-r2-cors.mjs
// Required for presigned URL uploads from the browser
// ============================================================

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'hr-interviews';
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing R2 environment variables. Make sure .env.local has:');
  console.error('   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function main() {
  console.log(`\n🔧 Configuring CORS for R2 bucket: ${R2_BUCKET_NAME}`);
  console.log(`   Endpoint: ${R2_ENDPOINT}\n`);

  // Check current CORS config
  try {
    const current = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME }));
    console.log('📋 Current CORS rules:', JSON.stringify(current.CORSRules, null, 2));
  } catch (err) {
    if (err.name === 'NoSuchCORSConfiguration' || err.$metadata?.httpStatusCode === 404) {
      console.log('📋 No CORS rules configured yet.');
    } else {
      console.log('⚠️  Could not read current CORS:', err.message);
    }
  }

  // Set new CORS rules
  const corsRules = [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'HEAD'],
      AllowedOrigins: ['*'], // Allow all origins (includes localhost + production)
      MaxAgeSeconds: 86400,
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Content-Range'],
    },
  ];

  await client.send(new PutBucketCorsCommand({
    Bucket: R2_BUCKET_NAME,
    CORSConfiguration: { CORSRules: corsRules },
  }));

  console.log('\n✅ CORS configured successfully!');
  console.log('   Allowed Origins: *');
  console.log('   Allowed Methods: GET, PUT, HEAD');
  console.log('   Max Age: 86400 seconds (24 hours)');

  // Verify
  try {
    const verify = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME }));
    console.log('\n🔍 Verification — Current CORS rules:');
    console.log(JSON.stringify(verify.CORSRules, null, 2));
  } catch {
    console.log('\n⚠️  Could not verify CORS (may take a moment to propagate)');
  }

  console.log('\n🎉 Done! Direct browser uploads and media access should now work.\n');
}

main().catch((err) => {
  console.error('\n❌ Failed to configure CORS:', err);
  process.exit(1);
});
