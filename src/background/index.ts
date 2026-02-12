import { DYNAMIC_SCRIPT_ID, type MessageRequest, type MessageResponse, STORAGE_KEY } from './types';

async function getStoredOrigins(): Promise<string[]> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored: unknown = result[STORAGE_KEY];
  return Array.isArray(stored) ? (stored as string[]) : [];
}

async function saveOrigins(origins: string[]): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: origins });
}

function toMatchPattern(origin: string): string {
  return `${origin}/*`;
}

async function registerDynamicScripts(origins: string[]): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [DYNAMIC_SCRIPT_ID],
    });
  } catch {
    // Script not registered yet — expected on first run
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
  const origins = await getStoredOrigins();
  await registerDynamicScripts(origins);
}

async function addOrigin(origin: string): Promise<MessageResponse> {
  const origins = await getStoredOrigins();

  if (origins.includes(origin)) {
    return { success: true, origins };
  }

  const updated = [...origins, origin];
  await saveOrigins(updated);
  await registerDynamicScripts(updated);
  return { success: true, origins: updated };
}

async function removeOrigin(origin: string): Promise<MessageResponse> {
  const origins = await getStoredOrigins();
  const updated = origins.filter((o) => o !== origin);
  await saveOrigins(updated);
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
      switch (message.type) {
        case 'GET_ORIGINS': {
          const origins = await getStoredOrigins();
          return { success: true, origins };
        }
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
