import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Drawer, Empty, Form, Input, List, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';

import { useLiveReload } from '../../shared/hooks/use-live-reload';
import { notifyDataChanged, sendRuntimeMessage } from '../../shared/messaging';
import { assistantRepository, modelConfigRepository } from '../../shared/repositories';
import type { AssistantPreset, ModelConfig } from '../../shared/types';

type AssistantFormValues = Pick<AssistantPreset, 'id' | 'name' | 'systemPrompt' | 'isDefault' | 'isQuickAssistant' | 'preferredModelId'>;

type Props = {
  embedded?: boolean;
};

export function AssistantsPage({ embedded = false }: Props) {
  const [assistants, setAssistants] = useState<AssistantPreset[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm<AssistantFormValues>();

  const { loading, reload } = useLiveReload(
    useCallback(async () => {
      const [nextAssistants, nextModels] = await Promise.all([assistantRepository.list(), modelConfigRepository.list()]);
      setAssistants(nextAssistants);
      setModels(nextModels);
    }, []),
  );

  const modelNameById = useMemo(
    () => Object.fromEntries(models.map((item) => [item.id, item.name])),
    [models],
  );

  const openDrawer = (assistant?: AssistantPreset) => {
    form.setFieldsValue(
      assistant || {
        name: '',
        systemPrompt: '',
        isDefault: false,
        isQuickAssistant: false,
      },
    );
    setDrawerOpen(true);
  };

  const saveAssistant = async () => {
    const values = await form.validateFields();
    await assistantRepository.save({
      ...values,
      id: values.id || '',
    });
    setDrawerOpen(false);
    await notifyDataChanged({ entity: 'assistant', action: values.id ? 'update' : 'create' });
    await sendRuntimeMessage({ type: 'REFRESH_CONTEXT_MENUS' });
    await reload();
  };

  const removeAssistant = async (id: string) => {
    await assistantRepository.remove(id);
    await notifyDataChanged({ entity: 'assistant', action: 'delete' });
    await sendRuntimeMessage({ type: 'REFRESH_CONTEXT_MENUS' });
    await reload();
  };

  return (
    <Space direction="vertical" size={embedded ? 12 : 16} style={{ width: '100%' }}>
      <Space align="start" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={embedded ? 5 : 3} style={{ margin: 0 }}>
          助手配置
        </Typography.Title>
        <Button type="primary" size={embedded ? 'small' : 'middle'} icon={<PlusOutlined />} onClick={() => openDrawer()}>
          新增助手
        </Button>
      </Space>

      {embedded ? (
        <List
          loading={loading}
          locale={{ emptyText: <Empty description="暂无助手配置" /> }}
          dataSource={assistants}
          renderItem={(record) => (
            <List.Item style={{ paddingBlock: 0 }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space align="start" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{record.name}</Typography.Text>
                      <Typography.Text type="secondary">
                        {record.preferredModelId ? modelNameById[record.preferredModelId] || '未指定模型' : '未指定模型'}
                      </Typography.Text>
                    </Space>
                    <Space size={[4, 4]} wrap>
                      {record.isDefault ? <Tag color="green">默认</Tag> : null}
                      {record.isQuickAssistant ? <Tag color="blue">快捷助手</Tag> : null}
                    </Space>
                  </Space>

                  <Typography.Paragraph ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>
                    {record.systemPrompt}
                  </Typography.Paragraph>

                  <Space wrap>
                    <Button size="small" onClick={() => openDrawer(record)}>
                      编辑
                    </Button>
                    <Popconfirm title="确认删除？" onConfirm={() => void removeAssistant(record.id)}>
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
          dataSource={assistants}
          columns={[
            { title: '名称', dataIndex: 'name' },
            {
              title: '标记',
              render: (_, record) => (
                <Space>
                  {record.isDefault ? <Tag color="green">默认</Tag> : null}
                  {record.isQuickAssistant ? <Tag color="blue">快捷助手</Tag> : null}
                </Space>
              ),
            },
            {
              title: '首选模型',
              dataIndex: 'preferredModelId',
              render: (value) => modelNameById[value] || '未指定',
            },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button onClick={() => openDrawer(record)}>编辑</Button>
                  <Popconfirm title="确认删除？" onConfirm={() => void removeAssistant(record.id)}>
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}

      <Drawer title="助手配置" width={embedded ? '100%' : 520} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="systemPrompt" label="系统提示词" rules={[{ required: true, message: '请输入系统提示词' }]}>
            <Input.TextArea rows={embedded ? 6 : 8} />
          </Form.Item>
          <Form.Item name="preferredModelId" label="首选模型">
            <Select allowClear options={models.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="isDefault" label="默认助手" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isQuickAssistant" label="快捷助手" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" onClick={() => void saveAssistant()}>
            保存
          </Button>
        </Form>
      </Drawer>
    </Space>
  );
}
