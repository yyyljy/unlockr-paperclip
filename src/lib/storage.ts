import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getServerEnv } from "@/lib/env";

export function getStorageClient() {
  const env = getServerEnv();

  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export function createResumeObjectKey(sessionId: string, filename: string) {
  const sanitizedFilename = filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `resume-uploads/${sessionId}/${sanitizedFilename || "resume.txt"}`;
}

export async function uploadResumeObject(input: {
  sessionId: string;
  filename: string;
  buffer: Buffer;
  contentType: string;
}) {
  const env = getServerEnv();
  const client = getStorageClient();
  const key = createResumeObjectKey(input.sessionId, input.filename);

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
    }),
  );

  return {
    bucket: env.S3_BUCKET,
    key,
  };
}

export async function deleteResumeObject(key: string) {
  const env = getServerEnv();
  const client = getStorageClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );
}

export async function downloadResumeObject(key: string) {
  const env = getServerEnv();
  const client = getStorageClient();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Missing object body for key ${key}`);
  }

  const chunks: Buffer[] = [];

  for await (const chunk of response.Body as AsyncIterable<Uint8Array | Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function pingStorage() {
  const env = getServerEnv();
  const client = getStorageClient();

  await client.send(
    new HeadBucketCommand({
      Bucket: env.S3_BUCKET,
    }),
  );

  return {
    bucket: env.S3_BUCKET,
  };
}
