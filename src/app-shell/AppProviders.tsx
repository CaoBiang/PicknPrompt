import { App as AntApp, ConfigProvider, type ThemeConfig } from 'antd';
import type { PropsWithChildren } from 'react';

import { appTheme } from '../shared/theme';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={appTheme as ThemeConfig}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
