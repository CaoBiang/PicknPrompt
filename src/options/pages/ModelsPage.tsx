import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Drawer, Empty, Form, Input, List, Popconfirm, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useCallback, useState } from 'react';

import { useLiveReload } from '../../shared/hooks/use-live-reload';
import { openAIResponsesGateway } from '../../shared/llm/openai-responses-gateway';
import { notifyDataChanged } from '../../shared/messaging';
import { modelConfigRepository } from '../../shared/repositories';
import type { ModelConfig } from '../../shared/types';

type ModelFormValues = Pick<ModelConfig, 'id' | 'name' | 'baseUrl' | 'apiKey' | 'model' | 'supportsVision' | 'enabled'>;

type Props = {
  embedded?: boolean;
};

export function ModelsPage({ embedded = false }: Props) {
  const [api, contextHolder] = message.useMessage();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm<ModelFormValues>();

  const { loading, reload } = useLiveReload(
    useCallback(async () => {
      setModels(await modelConfigRepository.list());
    }, []),
  );

  const openDrawer = (model?: ModelConfig) => {
    form.setFieldsValue(
      model || {
        name: '',
        baseUrl: '',
        apiKey: '',
        model: '',
        enabled: true,
        supportsVision: false,
      },
    );
    setDrawerOpen(true);
  };

  const saveModel = async () => {
    const values = await form.validateFields();
    await modelConfigRepository.save({
      ...values,
      id: values.id || '',
      status: 'untested',
    });
    setDrawerOpen(false);
    await notifyDataChanged({ entity: 'model', action: values.id ? 'update' : 'create' });
    await reload();
  };

  const removeModel = async (id: string) => {
    await modelConfigRepository.remove(id);
    await notifyDataChanged({ entity: 'model', action: 'delete' });
    await reload();
  };

  const testConnection = async () => {
    const values = await form.validateFields();
    const result = await openAIResponsesGateway.testConnection({
      ...values,
      id: values.id || 'temp',
      status: 'untested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (result.ok) {
      api.success(result.message);
      return;
    }
    api.error(result.message);
  };

  return (
    <Space direction="vertical" size={embedded ? 12 : 16} style={{ width: '100%' }}>
      {contextHolder}
      <Space align="start" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={embedded ? 5 : 3} style={{ margin: 0 }}>
          模型配置
        </Typography.Title>
        <Button type="primary" size={embedded ? 'small' : 'middle'} icon={<PlusOutlined />} onClick={() => openDrawer()}>
          新增模型
        </Button>
      </Space>

      {embedded ? (
        <List
          loading={loading}
          locale={{ emptyText: <Empty description="暂无模型配置" /> }}
          dataSource={models}
          renderItem={(record) => (
            <List.Item style={{ paddingBlock: 0 }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space align="start" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{record.name}</Typography.Text>
                      <Typography.Text type="secondary">{record.model}</Typography.Text>
                    </Space>
                    <Space size={[4, 4]} wrap>
                      {record.supportsVision ? <Tag color="purple">图片</Tag> : <Tag>文本</Tag>}
                      {record.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>}
                    </Space>
                  </Space>

                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                    {record.baseUrl}
                  </Typography.Paragraph>

                  <Space wrap>
                    <Button size="small" onClick={() => openDrawer(record)}>
                      编辑
                    </Button>
                    <Popconfirm title="确认删除？" onConfirm={() => void removeModel(record.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={false}
          dataSource={models}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: 'Model', dataIndex: 'model' },
            { title: 'Base URL', dataIndex: 'baseUrl' },
            {
              title: '能力',
              render: (_, record) => (
                <Space>
                  {record.supportsVision ? <Tag color="purple">图片</Tag> : <Tag>文本</Tag>}
                  {record.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>}
                </Space>
              ),
            },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button onClick={() => openDrawer(record)}>编辑</Button>
                  <Popconfirm title="确认删除？" onConfirm={() => void removeModel(record.id)}>
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}

      <Drawer
        title="模型配置"
        width={embedded ? '100%' : 460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Button onClick={() => void testConnection()}>测试连接</Button>}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true, message: '请输入 Base URL' }]}>
            <Input placeholder="https://api.openai.com" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true, message: '请输入 API Key' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true, message: '请输入 Model 名称' }]}>
            <Input placeholder="gpt-4.1-mini" />
          </Form.Item>
          <Form.Item name="supportsVision" label="支持图片" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" onClick={() => void saveModel()}>
            保存
          </Button>
        </Form>
      </Drawer>
    </Space>
  );
}
