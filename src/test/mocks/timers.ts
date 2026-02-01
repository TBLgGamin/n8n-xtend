import { vi } from 'vitest';

export function useFakeTimers(): void {
  vi.useFakeTimers();
}

export function useRealTimers(): void {
  vi.useRealTimers();
}

export function advanceTimersByTime(ms: number): void {
  vi.advanceTimersByTime(ms);
}

export function advanceTimersToNextTimer(): void {
  vi.advanceTimersToNextTimer();
}

export function runAllTimers(): void {
  vi.runAllTimers();
}

export function runOnlyPendingTimers(): void {
  vi.runOnlyPendingTimers();
}

export function getTimerCount(): number {
  return vi.getTimerCount();
}

export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function advanceTimersAndFlush(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await flushPromises();
}
