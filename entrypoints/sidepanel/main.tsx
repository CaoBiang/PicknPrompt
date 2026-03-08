import { createRoot } from 'react-dom/client';

import { AppProviders } from '../../src/app-shell/AppProviders';
import { ensureBootstrapData } from '../../src/shared/storage/bootstrap';
import { SidePanelApp } from '../../src/sidepanel/SidePanelApp';
import '../../src/styles/global.css';

void ensureBootstrapData();

const root = createRoot(document.getElementById('root')!);
root.render(
  <AppProviders>
    <SidePanelApp />
  </AppProviders>,
);
