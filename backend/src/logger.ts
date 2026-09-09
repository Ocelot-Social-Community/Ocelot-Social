import { Logger } from 'tslog'

import CONFIG from './config'

import type { ILogObj } from 'tslog'

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
 * One logger for the whole process. This used to be a LoggerSingleton class with a private
 * constructor and a lazy `getInstance()` — neither of which did anything: the constructor was
 * never called (getInstance builds a `Logger`, not a `LoggerSingleton`), and the lazy guard could
 * only ever run once, because the single call site was the module body below it. An ES module is
 * already evaluated exactly once per process, so the module-level binding IS the singleton.
 */
const logger: Logger<ILogObj> = new Logger({ minLevel, name: 'mainLogger' })
export default logger
type OcelotLogger = typeof logger
export type { OcelotLogger as Logger }
