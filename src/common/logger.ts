import { format, transports } from 'winston';
import 'winston-daily-rotate-file';

const logTransport = [
  new transports.Console({
    format: format.combine(
      format.uncolorize(),
      format.timestamp(),
      //   nestWinstonModuleUtilities.format.nestLike(),
      format.printf((msg:any) => {
        return `${new Date(msg.timestamp).toLocaleString()} [${msg.level}] - ${
          msg.context
        } : ${JSON.stringify(msg.message)}`;
      }),
    ),
  }),
  new transports.DailyRotateFile({
    filename: 'app-%DATE%.log',
    dirname: './logs',
    level: 'info',
    handleExceptions: true,
    json: false,
    zippedArchive: true,
    maxSize: process.env['LOG_MAX_SIZE'] || '20m',
    maxFiles: process.env['LOG_MAX_FILES'] || '14d',
  }),
];

export function getLogTransport() {
  return logTransport;
}
