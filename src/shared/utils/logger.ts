declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const BASE_PREFIX = 'n8n-xtend';

class Logger {
  private component: string | null;
  private minLevel: LogLevel;

  constructor(component?: string) {
    this.component = component ?? null;
    this.minLevel = __DEV__ ? 'debug' : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private format(level: LogLevel, message: string): string {
    if (!this.component) {
      return `[${BASE_PREFIX}:${level}] ${message}`;
    }
    return `[${BASE_PREFIX}:${this.component}:${level}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message), ...args);
    }
  }

  child(component: string): Logger {
    const childComponent = this.component ? `${this.component}:${component}` : component;
    return new Logger(childComponent);
  }
}

export const logger = new Logger();
