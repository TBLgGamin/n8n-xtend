export interface PollMonitorConfig {
  interval: number;
  check: () => void | Promise<void>;
  onStart?: () => void;
  onStop?: () => void;
}

export interface PollMonitor {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createPollMonitor(config: PollMonitorConfig): PollMonitor {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    start(): void {
      if (intervalId) return;
      config.onStart?.();
      config.check();
      intervalId = setInterval(config.check, config.interval);
    },

    stop(): void {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      config.onStop?.();
    },

    isRunning(): boolean {
      return intervalId !== null;
    },
  };
}

export interface MutationMonitorConfig {
  target?: () => Node;
  options?: MutationObserverInit;
  onMutation: (mutations: MutationRecord[]) => void;
  onStart?: () => void;
  onStop?: () => void;
}

export interface MutationMonitor {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

const DEFAULT_MUTATION_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
};

export function createMutationMonitor(config: MutationMonitorConfig): MutationMonitor {
  let observer: MutationObserver | null = null;

  return {
    start(): void {
      if (observer) return;
      config.onStart?.();
      observer = new MutationObserver(config.onMutation);
      const target = config.target?.() ?? document.body;
      observer.observe(target, config.options ?? DEFAULT_MUTATION_OPTIONS);
    },

    stop(): void {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      config.onStop?.();
    },

    isRunning(): boolean {
      return observer !== null;
    },
  };
}

export interface AdaptivePollMonitorConfig {
  activeInterval: number;
  idleInterval: number;
  idleTimeout: number;
  activityThrottle?: number;
  check: () => void | Promise<void>;
  onStart?: () => void;
  onStop?: () => void;
}

export interface AdaptivePollMonitor extends PollMonitor {
  resetActivity: () => void;
}

export function createAdaptivePollMonitor(config: AdaptivePollMonitorConfig): AdaptivePollMonitor {
  const throttle = config.activityThrottle ?? 50;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let isIdle = false;
  let lastActivityTime = 0;

  function setPollingRate(interval: number): void {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(config.check, interval);
  }

  function onActivity(): void {
    if (isIdle) {
      isIdle = false;
      setPollingRate(config.activeInterval);
    }
  }

  function resetIdleTimer(): void {
    const now = Date.now();
    if (now - lastActivityTime < throttle) return;
    lastActivityTime = now;

    onActivity();
    if (idleTimeoutId) clearTimeout(idleTimeoutId);
    idleTimeoutId = setTimeout(() => {
      isIdle = true;
      setPollingRate(config.idleInterval);
    }, config.idleTimeout);
  }

  return {
    start(): void {
      if (intervalId) return;
      config.onStart?.();
      config.check();
      setPollingRate(config.activeInterval);

      document.addEventListener('mousemove', resetIdleTimer, { passive: true });
      document.addEventListener('keydown', resetIdleTimer, { passive: true });
      document.addEventListener('click', resetIdleTimer, { passive: true });
    },

    stop(): void {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (idleTimeoutId) {
        clearTimeout(idleTimeoutId);
        idleTimeoutId = null;
      }

      document.removeEventListener('mousemove', resetIdleTimer);
      document.removeEventListener('keydown', resetIdleTimer);
      document.removeEventListener('click', resetIdleTimer);

      config.onStop?.();
    },

    isRunning(): boolean {
      return intervalId !== null;
    },

    resetActivity: resetIdleTimer,
  };
}
