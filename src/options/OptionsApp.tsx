import { DatabaseOutlined, FileTextOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { AssistantsPage } from './pages/AssistantsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { ModelsPage } from './pages/ModelsPage';
import { StashPage } from './pages/StashPage';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/models', label: '模型配置', icon: <RobotOutlined /> },
  { key: '/assistants', label: '助手配置', icon: <MessageOutlined /> },
  { key: '/stash', label: '暂存区', icon: <DatabaseOutlined /> },
  { key: '/conversations', label: '会话', icon: <FileTextOutlined /> },
];

function OptionsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout className="app-page" style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#edf2f8', borderRight: '1px solid #d7dee8', paddingTop: 16 }}>
        <div style={{ padding: '0 16px 16px', fontSize: 18, fontWeight: 600 }}>PicknPrompt</div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} style={{ background: 'transparent' }} />
      </Sider>
      <Content style={{ padding: 20 }}>
        <Routes>
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/assistants" element={<AssistantsPage />} />
          <Route path="/stash" element={<StashPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="*" element={<ModelsPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export function OptionsApp() {
  return (
    <HashRouter>
      <OptionsLayout />
    </HashRouter>
  );
}
