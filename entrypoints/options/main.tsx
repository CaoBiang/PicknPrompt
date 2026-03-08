import { createRoot } from 'react-dom/client';

import { AppProviders } from '../../src/app-shell/AppProviders';
import { OptionsApp } from '../../src/options/OptionsApp';
import { ensureBootstrapData } from '../../src/shared/storage/bootstrap';
import '../../src/styles/global.css';

void ensureBootstrapData();

const root = createRoot(document.getElementById('root')!);
root.render(
  <AppProviders>
    <OptionsApp />
  </AppProviders>,
);
