import { createRoot } from 'react-dom/client';

import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

import { ContentOverlay } from '../src/content/ContentOverlay';
import '../src/content/overlay.css';

export default defineContentScript(
  {
    matches: ['http://*/*', 'https://*/*'],
    runAt: 'document_end',
    cssInjectionMode: 'ui',
    async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'picknprompt-overlay-root',
      position: 'overlay',
      anchor: 'body',
      append: 'last',
      zIndex: 2147483647,
      onMount: (container) => {
        const root = createRoot(container);
        root.render(<ContentOverlay />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });

    ui.mount();
    },
  },
);
