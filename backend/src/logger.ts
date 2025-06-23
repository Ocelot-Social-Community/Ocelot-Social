import { ILogObj, Logger } from 'tslog'

import CONFIG from './config'

const { LOG_LEVEL } = CONFIG

const logLevels = ['SILLY', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const
type LogLevel = (typeof logLevels)[number]

function isLogLevel(level: string): level is LogLevel {
  return logLevels.includes(level as LogLevel)
}

if (!isLogLevel(LOG_LEVEL)) {
  throw new Error(`Unknown log level '${LOG_LEVEL}'`)
}

const logLevelsMap: Record<LogLevel, number> = {
  SILLY: 0,
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  WARN: 4,
  ERROR: 5,
  FATAL: 6,
}

const minLevel = logLevelsMap[LOG_LEVEL] // eslint-disable-line security/detect-object-injection

/**
 * The Singleton class defines the `getInstance` method that lets clients access
 * the unique singleton instance.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class LoggerSingleton {
  private static instance: Logger<ILogObj>

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static getInstance(): Logger<ILogObj> {
    if (!LoggerSingleton.instance) {
      LoggerSingleton.instance = new Logger({ minLevel, name: 'mainLogger' })
    }

    return LoggerSingleton.instance
  }
}

const logger = LoggerSingleton.getInstance()
export default logger
type OcelotLogger = typeof logger
export type { OcelotLogger as Logger }
