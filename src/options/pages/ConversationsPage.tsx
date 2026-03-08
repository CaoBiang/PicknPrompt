import { DeleteOutlined, DownloadOutlined, ImportOutlined } from '@ant-design/icons';
import { Button, Card, Drawer, Empty, Popconfirm, Space, Table, Typography, message } from 'antd';
import { useCallback, useRef, useState } from 'react';

import { useLiveReload } from '../../shared/hooks/use-live-reload';
import { exportConversationBundle, importConversationBytes } from '../../shared/import-export/conversation-markdown';
import { notifyDataChanged, sendRuntimeMessage } from '../../shared/messaging';
import { conversationRepository } from '../../shared/repositories';
import type { Conversation, ConversationBundle } from '../../shared/types';
import { ConversationPreview } from '../../shared/ui/ConversationPreview';
import { downloadBytes } from '../../shared/utils/download';

export function ConversationsPage() {
  const [api, contextHolder] = message.useMessage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [previewBundle, setPreviewBundle] = useState<ConversationBundle>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { loading, reload } = useLiveReload(
    useCallback(async () => {
      setConversations(await conversationRepository.list());
    }, []),
  );

  const handleImport = async (file?: File) => {
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const bundle = await importConversationBytes(bytes, file.name);
    await conversationRepository.save(bundle.conversation);
    for (const turn of bundle.turns) {
      await conversationRepository.saveTurn(turn);
    }
    await notifyDataChanged({ entity: 'conversation', action: 'create' });
    await reload();
    api.success('导入成功');
  };

  const handleExport = async (id: string) => {
    const bundle = await conversationRepository.getBundle(id);
    if (!bundle) return;
    const result = await exportConversationBundle(bundle);
    if (result.mimeType === 'application/zip') {
      await sendRuntimeMessage({ type: 'EXPORT_CONVERSATION', payload: { filename: result.filename, mimeType: result.mimeType, bytes: Array.from(result.bytes) } });
      api.success('已开始导出');
      return;
    }
    downloadBytes(result.filename, result.mimeType, result.bytes);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>会话管理</Typography.Title>
        <>
          <input ref={fileInputRef} type="file" accept=".md,.zip" hidden onChange={(event) => void handleImport(event.target.files?.[0])} />
          <Button icon={<ImportOutlined />} onClick={() => fileInputRef.current?.click()}>导入会话</Button>
        </>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        pagination={false}
        dataSource={conversations}
        columns={[
          { title: '标题', dataIndex: 'title' },
          { title: '更新时间', dataIndex: 'updatedAt' },
          { title: '操作', render: (_, record) => <Space><Button onClick={() => void conversationRepository.getBundle(record.id).then(setPreviewBundle)}>查看</Button><Button icon={<DownloadOutlined />} onClick={() => void handleExport(record.id)}>导出</Button><Popconfirm title="确认删除？" onConfirm={() => void conversationRepository.remove(record.id).then(async () => { await notifyDataChanged({ entity: 'conversation', action: 'delete' }); await reload(); })}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
        ]}
      />
      <Drawer width={760} title={previewBundle?.conversation.title || '会话预览'} open={Boolean(previewBundle)} onClose={() => setPreviewBundle(undefined)}>
        {previewBundle?.turns.length ? <Card><ConversationPreview turns={previewBundle.turns} /></Card> : <Empty description="暂无消息" />}
      </Drawer>
    </Space>
  );
}
