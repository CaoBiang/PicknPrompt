import { RUNTIME_MESSAGES } from './constants';
import type { DataChangedPayload, RuntimeMessage } from './types';

export async function sendRuntimeMessage<TResponse = unknown>(message: RuntimeMessage) {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return undefined as TResponse;
  }

  return chrome.runtime.sendMessage(message) as Promise<TResponse>;
}

export async function notifyDataChanged(payload: DataChangedPayload) {
  await sendRuntimeMessage({
    type: RUNTIME_MESSAGES.dataChanged,
    payload,
  });
}

export function subscribeRuntimeMessages(
  listener: (message: RuntimeMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => void,
) {
  const wrapped = (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    listener(message, sender, sendResponse);
  };

  chrome.runtime?.onMessage?.addListener(wrapped);

  return () => {
    chrome.runtime?.onMessage?.removeListener(wrapped);
  };
}
