import pino from 'pino';
import pinoPretty from 'pino-pretty';
import createRotatingWriteStream from 'pino-rotating-file-stream';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { NODE_ENV, LOGGER, LOG_LEVEL } from '../utils/constants';

const usePino = LOGGER === 'pino'; // Set in your .env file

// Use process.cwd() to get the root directory of the project
const rootLogDir = path.resolve(process.cwd(), 'logs');
const winstonLogDir = path.join(rootLogDir, 'winston');
const pinoLogDir = path.join(rootLogDir, 'pino');

// Ensure the logs directory and subdirectories for winston and pino exist
const createLogDirectories = () => {
    if (!fs.existsSync(rootLogDir)) {
        fs.mkdirSync(rootLogDir);
        console.log('Created logs directory in project root');
    }
    if (!fs.existsSync(winstonLogDir)) {
        fs.mkdirSync(winstonLogDir);
        console.log('Created winston logs directory in project root');
    }
    if (!fs.existsSync(pinoLogDir)) {
        fs.mkdirSync(pinoLogDir);
        console.log('Created pino logs directory in project root');
    }
};

createLogDirectories();

// Define a rotating stream for Pino
const rotatingStream = createRotatingWriteStream({
    filename: `server-${new Date().toISOString().slice(0, 10)}.log`,
    path: pinoLogDir,
    interval: '1d', // Rotate logs daily
    maxFiles: 14, // Keep logs for 14 days
    compress: true, // Compress the old log files
});

// Create pretty print streams for both console and file
const prettyStreamOptions = {
  colorize: true, // Enable colors for console output
  translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l", // Human readable timestamps
  ignore: 'pid,hostname', // Hide pid and hostname
};

// Create pretty streams
const consolePretty = pinoPretty({
  ...prettyStreamOptions,
  destination: process.stdout // Send to console
});

const filePretty = pinoPretty({
  ...prettyStreamOptions,
  colorize: false, // Disable colors for file output
  destination: rotatingStream // Send to rotating file stream
});
  
const streams = [
    { 
        level: NODE_ENV === 'test' ? 'silent' : LOG_LEVEL ?? 'info',
        stream: consolePretty
    },
    { 
        level: NODE_ENV === 'test' ? 'silent' : 'debug',
        stream: filePretty
    },
];

// Pino configuration
const pinoLogger = pino(
    {
      level: 'debug', // Minimum level for logger
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream(streams)
);

// Define the log formatting options for Winston
const { combine, timestamp, json, printf } = winston.format;
const timestampFormat = 'DD-MM-YYYY HH:mm:ss';

// Define a daily rotate transport for Winston
const dailyRotateFileTransport = new DailyRotateFile({
    filename: path.join(winstonLogDir, 'server-combined-%DATE%.log'),  // Log file name pattern
    level: NODE_ENV === 'test' ? 'silent' : 'debug',                          // Log all messages with level 'debug' or higher
    datePattern: 'YYYY-MM-DD',               // Rotate daily with date in file name
    zippedArchive: true,                     // Compress the rotated logs
    maxSize: '20m',                          // Maximum log file size before rotation (e.g., 20 megabytes)
    maxFiles: '14d',                         // Keep logs for the last 14 days
});

// Define an error file transport for Winston
const errorFileTransport = new DailyRotateFile({
    filename: path.join(winstonLogDir, 'server-error-%DATE%.log'),
    level: 'warn',                          // Log warn and higher messages in this file
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',                          // Keep error logs for 30 days
});

// Winston configuration
const winstonLogger = winston.createLogger({
    level: 'debug',
    format: combine(
        timestamp({ format: timestampFormat }),
        json(), // Use JSON format by default
        printf(({ timestamp, level, message, ...data }) => {
            const response = {
              level,
              message,
              data, // metadata
            };
            return JSON.stringify(response);
        })
    ),
    transports: [
        new winston.transports.Console({
            level: NODE_ENV === 'test' ? 'off' : LOG_LEVEL ?? 'info',
        }),
        dailyRotateFileTransport,
        errorFileTransport
    ],
});

// If we're not in production, show human-readable output in the console
if (NODE_ENV !== 'prod') {
    winstonLogger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Export the selected logger based on the environment variable
const logger = usePino ? pinoLogger : winstonLogger;

export default logger;