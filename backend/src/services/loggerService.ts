import {
  PutLogEventsCommand,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { getCloudWatchClient } from '../config/aws.js';
import { config } from '../config/env.js';

let sequenceToken: string | undefined = undefined;
let isInitialized = false;

async function ensureCloudWatchResources() {
  const client = getCloudWatchClient();
  if (!client || isInitialized) return;

  try {
    // Attempt creating log group if it doesn't exist
    try {
      await client.send(new CreateLogGroupCommand({ logGroupName: config.cloudwatch.logGroup }));
    } catch (e: any) {
      if (e.name !== 'ResourceAlreadyExistsException') {
        // Ignore already exists
      }
    }

    // Attempt creating log stream
    try {
      await client.send(
        new CreateLogStreamCommand({
          logGroupName: config.cloudwatch.logGroup,
          logStreamName: config.cloudwatch.logStream,
        })
      );
    } catch (e: any) {
      if (e.name !== 'ResourceAlreadyExistsException') {
        // Ignore already exists
      }
    }

    // Get sequence token if needed
    const streams = await client.send(
      new DescribeLogStreamsCommand({
        logGroupName: config.cloudwatch.logGroup,
        logStreamNamePrefix: config.cloudwatch.logStream,
      })
    );
    if (streams.logStreams && streams.logStreams.length > 0) {
      sequenceToken = streams.logStreams[0].uploadSequenceToken;
    }

    isInitialized = true;
  } catch (err: any) {
    console.warn(`[CloudWatch Notice] CloudWatch not initialized (${err.message}). Logging locally.`);
  }
}

export async function logEvent(level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: any) {
  const timestamp = new Date().toISOString();
  const logPayload = {
    timestamp,
    level,
    message,
    ...(metadata ? { metadata } : {}),
  };

  const formattedStr = `[${timestamp}] [${level}] ${message} ${metadata ? JSON.stringify(metadata) : ''}`;
  if (level === 'ERROR') {
    console.error(formattedStr);
  } else if (level === 'WARN') {
    console.warn(formattedStr);
  } else {
    console.log(formattedStr);
  }

  const client = getCloudWatchClient();
  if (!client || !config.cloudwatch.enabled) return;

  try {
    await ensureCloudWatchResources();
    const command = new PutLogEventsCommand({
      logGroupName: config.cloudwatch.logGroup,
      logStreamName: config.cloudwatch.logStream,
      sequenceToken,
      logEvents: [
        {
          timestamp: Date.now(),
          message: JSON.stringify(logPayload),
        },
      ],
    });
    const response = await client.send(command);
    sequenceToken = response.nextSequenceToken;
  } catch (err: any) {
    // If sequence token changed or network error, reset token
    if (err.name === 'InvalidSequenceTokenException' && err.expectedSequenceToken) {
      sequenceToken = err.expectedSequenceToken;
    }
  }
}

export const logger = {
  info: (msg: string, meta?: any) => logEvent('INFO', msg, meta),
  warn: (msg: string, meta?: any) => logEvent('WARN', msg, meta),
  error: (msg: string, meta?: any) => logEvent('ERROR', msg, meta),
};
