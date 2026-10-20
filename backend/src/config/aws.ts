import { S3Client } from '@aws-sdk/client-s3';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { config } from './env.js';

let s3Client: S3Client | null = null;
let cloudwatchClient: CloudWatchLogsClient | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const clientConfig: any = {
      region: config.aws.region,
    };

    // If explicit credentials are provided in env, use them; otherwise SDK uses IAM role on EC2
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        ...(config.aws.sessionToken ? { sessionToken: config.aws.sessionToken } : {}),
      };
    }

    s3Client = new S3Client(clientConfig);
  }
  return s3Client;
}

export function getCloudWatchClient(): CloudWatchLogsClient | null {
  if (!config.cloudwatch.enabled) {
    return null;
  }

  if (!cloudwatchClient) {
    const clientConfig: any = {
      region: config.aws.region,
    };

    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        ...(config.aws.sessionToken ? { sessionToken: config.aws.sessionToken } : {}),
      };
    }

    cloudwatchClient = new CloudWatchLogsClient(clientConfig);
  }
  return cloudwatchClient;
}
