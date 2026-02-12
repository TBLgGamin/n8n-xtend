export type MessageRequest =
  | { type: 'ADD_ORIGIN'; origin: string }
  | { type: 'REMOVE_ORIGIN'; origin: string }
  | { type: 'GET_ORIGINS' };

export type MessageResponse =
  | { success: true; origins: string[] }
  | { success: false; error: string };

export const STORAGE_KEY = 'n8n-xtend-origins';
export const DYNAMIC_SCRIPT_ID = 'n8n-xtend-dynamic';
