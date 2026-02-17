import {
  getSyncItem,
  initChromeStorage,
  setSyncItem,
  waitForChromeStorage,
} from '../shared/utils/chrome-storage';
import { DYNAMIC_SCRIPT_ID, type MessageRequest, type MessageResponse, STORAGE_KEY } from './types';

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
  } catch {
    /* not registered yet */
  }

  if (origins.length === 0) {
    return;
  }

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
  await syncScriptsFromStorage();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncScriptsFromStorage();
});

chrome.runtime.onMessage.addListener(
  (
    message: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    const handleMessage = async (): Promise<MessageResponse> => {
      await waitForChromeStorage();
      switch (message.type) {
        case 'GET_ORIGINS':
          return { success: true, origins: getStoredOrigins() };
        case 'ADD_ORIGIN':
          return addOrigin(message.origin);
        case 'REMOVE_ORIGIN':
          return removeOrigin(message.origin);
      }
    };

    handleMessage().then(sendResponse);
    return true;
  },
);
