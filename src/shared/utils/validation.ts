const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function sanitizeId(id: string): string {
  if (isValidId(id)) {
    return id;
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function validateAndEncodeId(id: string): string {
  if (!isValidId(id)) {
    throw new Error(`Invalid ID format: ${id}`);
  }
  return encodeURIComponent(id);
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = Object.create(null) as T;
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    result[key as keyof T] = value as T[keyof T];
  }
  return result;
}
