import {
  getSyncItem,
  initChromeStorage,
  setSyncItem,
  waitForChromeStorage,
} from '../shared/utils/chrome-storage';
import { logger } from '../shared/utils/logger';
import { DYNAMIC_SCRIPT_ID, type MessageRequest, type MessageResponse, STORAGE_KEY } from './types';

const log = logger.child('background');

function getStoredOrigins(): string[] {
  const stored = getSyncItem<string[]>(STORAGE_KEY);
  return Array.isArray(stored) ? stored : [];
}

function saveOrigins(origins: string[]): void {
  setSyncItem(STORAGE_KEY, origins);
}

function toMatchPattern(origin: string): string {
  return `${origin}/*`;
}

async function registerDynamicScripts(origins: string[]): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
  } catch {}

  if (origins.length === 0) {
    log.debug('No origins to register');
    return;
  }

  log.debug('Registering dynamic scripts', { count: origins.length });
  await chrome.scripting.registerContentScripts([
    {
      id: DYNAMIC_SCRIPT_ID,
      matches: origins.map(toMatchPattern),
      js: ['content.js'],
      css: ['content.css'],
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
  ]);
}

async function syncScriptsFromStorage(): Promise<void> {
  await initChromeStorage();
  const origins = getStoredOrigins();
  await registerDynamicScripts(origins);
}

async function addOrigin(origin: string): Promise<MessageResponse> {
  const origins = getStoredOrigins();

  if (origins.includes(origin)) {
    return { success: true, origins };
  }

  const updated = [...origins, origin];
  saveOrigins(updated);
  await registerDynamicScripts(updated);
  return { success: true, origins: updated };
}

async function removeOrigin(origin: string): Promise<MessageResponse> {
  const origins = getStoredOrigins();
  const updated = origins.filter((o) => o !== origin);
  saveOrigins(updated);
  await registerDynamicScripts(updated);
  return { success: true, origins: updated };
}

chrome.runtime.onInstalled.addListener(async () => {
  log.info('Extension installed/updated');
  await syncScriptsFromStorage();
});

chrome.runtime.onStartup.addListener(async () => {
  log.info('Browser started');
  await syncScriptsFromStorage();
});

chrome.runtime.onMessage.addListener(
  (
    message: MessageRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (sender.id !== chrome.runtime.id) return;

    log.debug('Message received', { type: message.type });
    const handleMessage = async (): Promise<MessageResponse> => {
      await waitForChromeStorage();
      switch (message.type) {
        case 'GET_ORIGINS':
          return { success: true, origins: getStoredOrigins() };
        case 'ADD_ORIGIN':
          log.debug('Origin added', { origin: message.origin });
          return addOrigin(message.origin);
        case 'REMOVE_ORIGIN':
          log.debug('Origin removed', { origin: message.origin });
          return removeOrigin(message.origin);
      }
    };

    handleMessage().then(sendResponse);
    return true;
  },
);
