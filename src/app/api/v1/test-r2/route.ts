// TEMPORARY: Minimal R2 test — no auth, no frills
// DELETE THIS after debugging
// GET /api/v1/test-r2?key=<r2-key>

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  const steps: string[] = [];

  try {
    // Step 1: Import SDK
    steps.push('1-importing');
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    steps.push('1-imported');

    // Step 2: Create client
    steps.push('2-creating-client');
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    steps.push('2-client-created');

    // Step 3: Get object
    steps.push('3-getting-object');
    const result = await client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'hr-interviews',
      Key: key,
    }));
    steps.push('3-got-object: contentType=' + result.ContentType + ', contentLength=' + result.ContentLength);

    // Step 4: Read body
    steps.push('4-reading-body');
    const body = result.Body;
    if (!body) {
      return NextResponse.json({ error: 'No body', steps }, { status: 404 });
    }

    let bytes: Uint8Array;
    if (typeof (body as any).transformToByteArray === 'function') {
      steps.push('4a-using-transformToByteArray');
      bytes = await (body as any).transformToByteArray();
    } else {
      steps.push('4b-using-manual-chunks');
      const chunks: Uint8Array[] = [];
      for await (const chunk of body as any) {
        chunks.push(chunk);
      }
      // Combine chunks
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      bytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
    }
    steps.push('4-body-read: ' + bytes.length + ' bytes');

    // Step 5: Return as Response
    steps.push('5-building-response');
    const contentType = result.ContentType
      || (key.endsWith('.webm') ? 'video/webm'
        : key.endsWith('.mp3') || key.endsWith('.mpeg') ? 'audio/mpeg'
        : 'application/octet-stream');

    // Use Uint8Array directly — cast needed for strict TS
    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': bytes.length.toString(),
        'Cache-Control': 'private, max-age=3600',
        'X-Debug-Steps': steps.join(' | '),
      },
    });
  } catch (err: any) {
    steps.push('ERROR: ' + err?.name + ': ' + err?.message);
    return NextResponse.json({
      error: err?.message,
      name: err?.name,
      steps,
      metadata: err?.$metadata,
      stack: err?.stack?.substring(0, 500),
    }, { status: 500 });
  }
}
