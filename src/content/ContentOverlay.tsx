import { useEffect, useMemo, useRef, useState } from 'react';

import { sendRuntimeMessage } from '../shared/messaging';
import { getAssistants } from '../shared/storage/chrome-storage';
import type { AssistantPreset } from '../shared/types';

type OverlayTarget =
  | { kind: 'selection'; x: number; y: number; text: string }
  | { kind: 'image'; x: number; y: number; src: string; alt?: string };

function truncate(value: string, limit = 120) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

export function ContentOverlay() {
  const [quickAssistants, setQuickAssistants] = useState<AssistantPreset[]>([]);
  const [target, setTarget] = useState<OverlayTarget>();
  const [toast, setToast] = useState<string>();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAssistants = async () => {
      const assistants = await getAssistants();
      setQuickAssistants(assistants.filter((item) => item.isQuickAssistant));
    };

    void loadAssistants();
    chrome.storage?.onChanged?.addListener(loadAssistants);

    return () => {
      chrome.storage?.onChanged?.removeListener(loadAssistants);
    };
  }, []);

  useEffect(() => {
    const clearOverlay = () => setTarget(undefined);

    const isInsideOverlay = (event: MouseEvent) => {
      const eventPath = event.composedPath();
      return eventPath.some(
        (node) =>
          node === overlayRef.current
          || (node instanceof HTMLElement && node.classList.contains('picknprompt-overlay')),
      );
    };

    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (!selection || !text || !selection.rangeCount) {
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setTarget({
        kind: 'selection',
        text,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 8,
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      const element = (event.target as HTMLElement | null)?.closest?.('img') as HTMLImageElement | null;

      if (!element?.src || element.width < 48 || window.getSelection()?.toString().trim()) {
        return;
      }

      const rect = element.getBoundingClientRect();
      setTarget({
        kind: 'image',
        src: element.currentSrc || element.src,
        alt: element.alt,
        x: rect.right + window.scrollX - 220,
        y: rect.top + window.scrollY + 8,
      });
    };

    const handleSelectionChange = () => {
      const text = window.getSelection()?.toString().trim();
      if (!text && target?.kind === 'selection') {
        setTarget(undefined);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!isInsideOverlay(event)) {
        clearOverlay();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', clearOverlay, true);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', clearOverlay, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [target?.kind]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(undefined), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const style = useMemo(
    () => ({
      left: Math.max(12, target?.x || 12),
      top: Math.max(12, target?.y || 12),
    }),
    [target?.x, target?.y],
  );

  const addToStash = async () => {
    if (!target) {
      return;
    }

    try {
      if (target.kind === 'selection') {
        await sendRuntimeMessage({
          type: 'CAPTURE_TEXT',
          payload: {
            text: target.text,
            sourceUrl: location.href,
            sourceTitle: document.title,
            captureMeta: {
              capturedFrom: 'selection',
              pageSelection: target.text,
            },
          },
        });
      } else {
        await sendRuntimeMessage({
          type: 'CAPTURE_IMAGE',
          payload: {
            imageUrl: target.src,
            alt: target.alt,
            sourceUrl: location.href,
            sourceTitle: document.title,
            captureMeta: {
              capturedFrom: 'image-button',
              alt: target.alt,
            },
          },
        });
      }

      setToast('已加入暂存区');
      setTarget(undefined);
    } catch {
      setToast('加入暂存区失败');
    }
  };

  const startQuickChat = async (assistantId: string) => {
    if (!target) {
      return;
    }

    try {
      await sendRuntimeMessage({
        type: 'START_QUICK_CHAT',
        payload:
          target.kind === 'selection'
            ? {
                assistantId,
                kind: 'text',
                text: target.text,
                sourceUrl: location.href,
                sourceTitle: document.title,
              }
            : {
                assistantId,
                kind: 'image',
                imageUrl: target.src,
                alt: target.alt,
                sourceUrl: location.href,
                sourceTitle: document.title,
              },
      });

      setToast('正在打开侧栏…');
      setTarget(undefined);
    } catch {
      setToast('启动快捷对话失败');
    }
  };

  if (!target) {
    return toast ? <div className="picknprompt-toast">{toast}</div> : null;
  }

  return (
    <>
      <div ref={overlayRef} className="picknprompt-overlay" style={style}>
        <p className="picknprompt-overlay__title">PicknPrompt</p>
        {target.kind === 'selection' ? (
          <div className="picknprompt-overlay__preview">{truncate(target.text)}</div>
        ) : (
          <>
            <img className="picknprompt-overlay__image" src={target.src} alt={target.alt || '网页图片'} />
            <div className="picknprompt-overlay__preview">{target.alt || '网页图片'}</div>
          </>
        )}
        <div className="picknprompt-overlay__actions">
          <button className="picknprompt-overlay__button picknprompt-overlay__button--primary" onClick={() => void addToStash()}>
            加入暂存区
          </button>
        </div>
        {quickAssistants.length ? (
          <div className="picknprompt-overlay__quick" style={{ marginTop: 8 }}>
            {quickAssistants.map((assistant) => (
              <button key={assistant.id} className="picknprompt-overlay__button" onClick={() => void startQuickChat(assistant.id)}>
                {assistant.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {toast ? <div className="picknprompt-toast">{toast}</div> : null}
    </>
  );
}
