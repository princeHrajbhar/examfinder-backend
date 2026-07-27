import { S3Client } from '@aws-sdk/client-s3';
import { ENV } from './env.js';

const s3 = new S3Client({
  region: ENV.AWS_REGION,

  /*
   * Buckets containing dots cannot safely use virtual-hosted HTTPS endpoints
   * with Amazon's wildcard S3 certificate. Force path-style SDK requests for
   * those buckets.
   */
  forcePathStyle: ENV.AWS_BUCKET_NAME.includes('.'),

  ...(ENV.AWS_ACCESS_KEY_ID && ENV.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: ENV.AWS_ACCESS_KEY_ID,
          secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export default s3;
