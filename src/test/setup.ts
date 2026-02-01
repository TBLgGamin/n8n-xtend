import { afterEach, beforeEach, vi } from 'vitest';
import { resetLocationMock, setupLocationMock } from './mocks/dom';
import { resetFetchMock, setupFetchMock } from './mocks/fetch';
import { resetObserverMocks, setupObserverMocks } from './mocks/observers';
import { resetStorageMock, setupStorageMock } from './mocks/storage';

declare global {
  const __DEV__: boolean;
}

vi.stubGlobal('__DEV__', false);

beforeEach(() => {
  setupLocationMock();
  setupStorageMock();
  setupFetchMock();
  setupObserverMocks();
});

afterEach(() => {
  resetLocationMock();
  resetStorageMock();
  resetFetchMock();
  resetObserverMocks();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});
