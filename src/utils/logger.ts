import pino from 'pino';
import pinoPretty from 'pino-pretty';
import createRotatingWriteStream from 'pino-rotating-file-stream';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { NODE_ENV, LOGGER, LOG_LEVEL } from './constants';

const usePino = LOGGER === 'pino';

const logger = (() => {
    if (NODE_ENV !== 'test') {
        // Use process.cwd() to get the root directory of the project
        const rootLogDir = path.resolve(process.cwd(), 'logs');
        const winstonLogDir = path.join(rootLogDir, 'winston');
        const pinoLogDir = path.join(rootLogDir, 'pino');

        // Define subdirectories for error logs and general logs
        const errorLogDir = path.join(winstonLogDir, 'error-logs');
        const generalLogDir = path.join(winstonLogDir, 'general-logs');

        // Ensure the logs directory and subdirectories for winston and pino exist
        const createLogDirectories = () => {
            if (!fs.existsSync(rootLogDir)) {
                fs.mkdirSync(rootLogDir);
                console.log('Created logs directory in project root');
            }
            if (!fs.existsSync(winstonLogDir)) {
                fs.mkdirSync(winstonLogDir);
                fs.mkdirSync(errorLogDir);
                fs.mkdirSync(generalLogDir);
                console.log('Created winston logs directory in project root');
            }
            if (!fs.existsSync(pinoLogDir)) {
                fs.mkdirSync(pinoLogDir);
                console.log('Created pino logs directory in project root');
            }
        };

        createLogDirectories();

        if (usePino) {
            // Initialize Pino file streams and logger
            const rotatingStream = createRotatingWriteStream({
                filename: `server-${new Date().toISOString().slice(0, 10)}.log`,
                path: pinoLogDir,
                interval: '1d',
                maxFiles: 14,
                size: '20M',
                compress: true
            });

            const consolePretty = pinoPretty({
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'hostname',
                destination: process.stdout
            });

            const filePretty = pinoPretty({
                colorize: false,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname',
                destination: rotatingStream
            });

            const streams = [
                {
                    level: LOG_LEVEL,
                    stream: consolePretty
                },
                {
                    level: 'debug',
                    stream: filePretty
                },
            ];

            return pino(
                {
                    level: 'debug',
                    timestamp: pino.stdTimeFunctions.isoTime
                },
                pino.multistream(streams)
            );
        } else {
            // Initialize Winston file transports and logger
            const { combine, timestamp, json, printf } = winston.format;
            const timestampFormat = 'DD-MM-YYYY HH:mm:ss';

            const dailyRotateFileTransport = new DailyRotateFile({
                filename: 'server-combined-%DATE%.log',
                dirname: generalLogDir,
                level: 'debug',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d'
            });

            const errorFileTransport = new DailyRotateFile({
                filename: 'server-error-%DATE%.log',
                dirname: errorLogDir,
                level: 'warn',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d'
            });

            const loggerInstance = winston.createLogger({
                level: 'debug',
                format: combine(
                    timestamp({ format: timestampFormat }),
                    json(),
                    printf(({ timestamp, level, message, ...data }) => {
                        const response = {
                            level,
                            message,
                            data
                        };
                        return JSON.stringify(response);
                    })
                ),
                transports: [
                    new winston.transports.Console({
                        level: LOG_LEVEL
                    }),
                    dailyRotateFileTransport,
                    errorFileTransport,
                ],
            });

            if (NODE_ENV !== 'prod') {
                loggerInstance.add(
                    new winston.transports.Console({
                        format: winston.format.simple(),
                        level: LOG_LEVEL
                    })
                );
            }

            return loggerInstance;
        }
    } else if (usePino) {
        // In testing environment, initialize a basic logger without file streams
        return pino({
            level: 'silent',
        });
    } else {
        return winston.createLogger({
            level: 'silent',
            transports: [new winston.transports.Console()],
        });
    }
})();

export default logger;