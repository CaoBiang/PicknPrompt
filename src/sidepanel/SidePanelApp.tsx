import { ArrowLeftOutlined, DeleteOutlined, DownloadOutlined, MessageOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { Bubble, Conversations, Sender } from '@ant-design/x';
import { Alert, Button, Collapse, Drawer, Empty, Layout, Popconfirm, Select, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AssistantsPage } from '../options/pages/AssistantsPage';
import { ModelsPage } from '../options/pages/ModelsPage';
import { DEFAULT_QUICK_CHAT_PROMPT } from '../shared/constants';
import { useComposeDraft } from '../shared/hooks/use-compose-draft';
import { useLiveReload } from '../shared/hooks/use-live-reload';
import { exportStashItemsToMarkdown } from '../shared/import-export/stash-markdown';
import { openAIResponsesGateway } from '../shared/llm/openai-responses-gateway';
import { notifyDataChanged } from '../shared/messaging';
import { assistantRepository, conversationRepository, DEFAULT_CONVERSATION_TITLE, modelConfigRepository, stashRepository } from '../shared/repositories';
import { getPreferences, savePreferences } from '../shared/storage/chrome-storage';
import type { AssistantPreset, Conversation, ConversationTurn, ModelConfig, StashItem } from '../shared/types';
import { MarkdownMessage } from '../shared/ui/MarkdownMessage';
import { StashListPane } from '../shared/ui/StashListPane';
import { downloadBytes } from '../shared/utils/download';
import { createId } from '../shared/utils/id';
import { buildUserTurnParts, stashItemToSnapshot } from '../shared/utils/markdown';
import { nowIso } from '../shared/utils/time';
import { useUiStore } from '../state/ui-store';

const { Header, Content } = Layout;

type ViewMode = 'chat' | 'settings';

const pickAssistant = (assistants: AssistantPreset[], preferredId?: string) =>
  assistants.find((item) => item.id === preferredId) || assistants.find((item) => item.isDefault) || assistants[0];

const pickModel = (models: ModelConfig[], preferredId?: string) =>
  models.find((item) => item.id === preferredId && item.enabled) || models.find((item) => item.enabled) || models[0];

export function SidePanelApp() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [assistants, setAssistants] = useState<AssistantPreset[]>([]);
  const [stashItems, setStashItems] = useState<StashItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [selectedStashIds, setSelectedStashIds] = useState<string[]>([]);
  const [assistantId, setAssistantId] = useState<string>();
  const [modelId, setModelId] = useState<string>();
  const [inputValue, setInputValue] = useState('');
  const [warning, setWarning] = useState<string>();
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [conversationDrawerOpen, setConversationDrawerOpen] = useState(false);
  const autoSentRef = useRef(false);

  const { draft, setDraft } = useComposeDraft();
  const { stashKeyword, stashSourceFilter, stashTitleFilter, activeConversationId, setActiveConversationId, setFilters } = useUiStore();

  const loadData = useCallback(async () => {
    const [nextModels, nextAssistants, nextStash, nextConversations, preferences] = await Promise.all([
      modelConfigRepository.list(),
      assistantRepository.list(),
      stashRepository.list(),
      conversationRepository.list(),
      getPreferences(),
    ]);

    setModels(nextModels);
    setAssistants(nextAssistants);
    setStashItems(nextStash);
    setConversations(nextConversations);
    setAssistantId((current) => current || pickAssistant(nextAssistants, draft.assistantId || preferences.lastAssistantId)?.id);
    setModelId((current) => current || pickModel(nextModels, draft.modelConfigId || preferences.lastModelConfigId)?.id);
    setSelectedStashIds((current) => (current.length ? current : draft.selectedStashIds));

    const currentConversationId = nextConversations.some((item) => item.id === activeConversationId)
      ? activeConversationId
      : nextConversations[0]?.id;
    if (currentConversationId) {
      setActiveConversationId(currentConversationId);
      const bundle = await conversationRepository.getBundle(currentConversationId);
      setTurns(bundle?.turns || []);
    } else {
      setTurns([]);
    }
  }, [activeConversationId, draft.assistantId, draft.modelConfigId, draft.selectedStashIds, setActiveConversationId]);

  useLiveReload(loadData);

  useEffect(() => {
    if (assistantId || modelId) {
      void savePreferences({
        lastAssistantId: assistantId,
        lastModelConfigId: modelId,
      });
    }
  }, [assistantId, modelId]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    void conversationRepository.getBundle(activeConversationId).then((bundle) => setTurns(bundle?.turns || []));
  }, [activeConversationId]);

  const assistant = assistants.find((item) => item.id === assistantId);
  const model = models.find((item) => item.id === modelId);
  const selectedStash = stashItems.filter((item) => selectedStashIds.includes(item.id));
  const activeConversation = conversations.find((item) => item.id === activeConversationId);

  const createConversation = async () => {
    const reusableConversation = await conversationRepository.findReusableDraft();
    if (reusableConversation) {
      setActiveConversationId(reusableConversation.id);
      setTurns([]);
      setConversationDrawerOpen(false);
      return reusableConversation;
    }

    const conversation = await conversationRepository.create({
      defaultAssistantId: assistantId,
      defaultModelConfigId: modelId,
    });

    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setTurns([]);
    setConversationDrawerOpen(false);
    await notifyDataChanged({ entity: 'conversation', action: 'create' });
    return conversation;
  };

  const removeConversation = async (conversationId: string) => {
    await conversationRepository.remove(conversationId);
    await notifyDataChanged({ entity: 'conversation', action: 'delete' });
    await loadData();
  };

  const exportSelectedStash = () => {
    if (!selectedStash.length) {
      return;
    }

    const result = exportStashItemsToMarkdown(selectedStash);
    downloadBytes(result.filename, result.mimeType, result.bytes);
  };

  const sendMessage = async (submitted?: string) => {
    const prompt = (submitted ?? inputValue).trim();
    setWarning(undefined);

    if (!assistant || !model) {
      setWarning('请先配置并选择模型与助手。');
      return;
    }

    if (!prompt) {
      setWarning('请输入问题。');
      return;
    }

    if (selectedStash.some((item) => item.type === 'image') && !model.supportsVision) {
      setWarning('当前模型不支持图片输入，请切换到支持图片的模型。');
      return;
    }

    const conversation = activeConversationId ? await conversationRepository.get(activeConversationId) : await createConversation();
    if (!conversation) {
      return;
    }

    const history = [...turns];
    const timestamp = nowIso();

    const userTurn: ConversationTurn = {
      id: createId('turn'),
      conversationId: conversation.id,
      role: 'user',
      parts: buildUserTurnParts(selectedStash, prompt),
      assistantSnapshot: {
        id: assistant.id,
        name: assistant.name,
        systemPrompt: assistant.systemPrompt,
        preferredModelId: assistant.preferredModelId,
      },
      modelSnapshot: {
        id: model.id,
        name: model.name,
        baseUrl: model.baseUrl,
        model: model.model,
        supportsVision: model.supportsVision,
      },
      stashSnapshots: selectedStash.map(stashItemToSnapshot),
      streamState: 'done',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const assistantTurn: ConversationTurn = {
      id: createId('turn'),
      conversationId: conversation.id,
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
      assistantSnapshot: userTurn.assistantSnapshot,
      modelSnapshot: userTurn.modelSnapshot,
      stashSnapshots: userTurn.stashSnapshots,
      streamState: 'streaming',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setSending(true);
    setInputValue('');

    await conversationRepository.saveTurn(userTurn);
    await conversationRepository.saveTurn(assistantTurn);
    setTurns((current) => [...current, userTurn, assistantTurn]);

    let content = '';

    try {
      for await (const event of openAIResponsesGateway.sendStream({
        modelConfig: model,
        assistant,
        history,
        stashItems: selectedStash,
        userPrompt: prompt,
      })) {
        if (event.type === 'text-delta') {
          content += event.delta;
          const nextTurn = {
            ...assistantTurn,
            parts: [{ type: 'text' as const, text: content }],
            streamState: 'streaming' as const,
          };

          await conversationRepository.saveTurn(nextTurn);
          setTurns((current) => current.map((item) => (item.id === assistantTurn.id ? nextTurn : item)));
        }

        if (event.type === 'error') {
          throw new Error(event.message);
        }
      }

      const doneTurn = {
        ...assistantTurn,
        parts: [{ type: 'text' as const, text: content || '（模型未返回文本内容）' }],
        streamState: 'done' as const,
      };

      await conversationRepository.saveTurn(doneTurn);
      setTurns((current) => current.map((item) => (item.id === assistantTurn.id ? doneTurn : item)));
      await setDraft({ ...draft, pendingAutoSend: false, seedUserPrompt: '' });
      await notifyDataChanged({ entity: 'conversation', action: 'update' });
    } catch (error) {
      const failedTurn = {
        ...assistantTurn,
        parts: [{ type: 'text' as const, text: content || '请求失败。' }],
        streamState: 'error' as const,
        errorMessage: error instanceof Error ? error.message : '请求失败',
      };

      await conversationRepository.saveTurn(failedTurn);
      setTurns((current) => current.map((item) => (item.id === assistantTurn.id ? failedTurn : item)));
      setWarning(failedTurn.errorMessage);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (autoSentRef.current || !draft.pendingAutoSend || !assistants.length || !models.length) {
      return;
    }

    autoSentRef.current = true;
    setSelectedStashIds(draft.selectedStashIds);
    if (draft.assistantId) {
      setAssistantId(draft.assistantId);
    }
    if (draft.modelConfigId) {
      setModelId(draft.modelConfigId);
    }

    const prompt = draft.seedUserPrompt || DEFAULT_QUICK_CHAT_PROMPT;
    setInputValue(prompt);
    void sendMessage(prompt);
  }, [assistants.length, draft, models.length]);

  const bubbleItems = useMemo(
    () =>
      turns.map((turn) => ({
        key: turn.id,
        role: turn.role === 'assistant' ? 'ai' : turn.role,
        content: <MarkdownMessage parts={turn.parts} />,
        loading: turn.streamState === 'streaming',
      })),
    [turns],
  );

  return (
    <Layout className="app-page" style={{ minHeight: '100vh' }}>
      <Drawer
        className="conversation-drawer"
        title="会话列表"
        placement="left"
        width={280}
        open={conversationDrawerOpen}
        onClose={() => setConversationDrawerOpen(false)}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Button
            className="conversation-drawer__create-button"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => void createConversation()}
            block
          >
            新建会话
          </Button>
          {conversations.length ? (
            <Conversations
              className="conversation-drawer__list"
              items={conversations.map((item) => ({
                key: item.id,
                label: (
                  <span className="conversation-item__label">
                    <span className="conversation-item__text">{item.title}</span>
                    <Popconfirm
                      title="确认删除该会话？"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void removeConversation(item.id)}
                    >
                      <Button
                        aria-label="删除会话"
                        className="conversation-item__delete"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        type="text"
                        onClick={(event) => event.stopPropagation()}
                      />
                    </Popconfirm>
                  </span>
                ),
              }))}
              activeKey={activeConversationId}
              onActiveChange={(value) => {
                setActiveConversationId(String(value));
                setConversationDrawerOpen(false);
              }}
            />
          ) : (
            <Empty description="还没有会话" />
          )}
        </Space>
      </Drawer>

      <Layout>
        <Header style={{ background: 'transparent', padding: 12, height: 'auto' }}>
          {viewMode === 'chat' ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space wrap>
                  <Button icon={<MessageOutlined />} onClick={() => setConversationDrawerOpen(true)}>
                    会话
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={() => void createConversation()}>
                    新建
                  </Button>
                </Space>
                <Button icon={<SettingOutlined />} onClick={() => setViewMode('settings')}>
                  管理
                </Button>
              </Space>

              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Typography.Text strong ellipsis style={{ maxWidth: '100%' }}>
                  {activeConversation?.title || DEFAULT_CONVERSATION_TITLE}
                </Typography.Text>
              </Space>

              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <Select
                  placeholder="模型"
                  style={{ width: '100%' }}
                  value={modelId}
                  options={models.map((item) => ({ value: item.id, label: `${item.name} · ${item.model}` }))}
                  onChange={setModelId}
                />
                <Select
                  placeholder="助手"
                  style={{ width: '100%' }}
                  value={assistantId}
                  options={assistants.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={setAssistantId}
                />
              </div>
            </Space>
          ) : (
            <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space direction="vertical" size={0}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  侧栏管理
                </Typography.Title>
              </Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setViewMode('chat')}>
                返回对话
              </Button>
            </Space>
          )}
        </Header>

        <Content
          style={{
            padding: '0 12px 12px',
            display: 'grid',
            gap: 12,
            gridTemplateRows: viewMode === 'chat' ? 'auto minmax(0, 1fr) auto' : 'minmax(0, 1fr)',
          }}
        >
          {viewMode === 'settings' ? (
            <div className="panel-surface thin-scrollbar" style={{ padding: 12, overflow: 'auto' }}>
              <Collapse
                defaultActiveKey={['models', 'assistants']}
                items={[
                  {
                    key: 'models',
                    label: `模型配置 · ${models.length}`,
                    children: <ModelsPage embedded />,
                  },
                  {
                    key: 'assistants',
                    label: `助手配置 · ${assistants.length}`,
                    children: <AssistantsPage embedded />,
                  },
                ]}
              />
            </div>
          ) : (
            <>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {warning ? <Alert type="warning" showIcon closable message={warning} onClose={() => setWarning(undefined)} /> : null}
                {!models.length || !assistants.length ? (
                  <Alert type="info" showIcon message="请先在这里添加至少一个模型和一个助手。" />
                ) : null}

                <Collapse
                  defaultActiveKey={['stash']}
                  items={[
                    {
                      key: 'stash',
                      label: `暂存区 · 已选 ${selectedStashIds.length}`,
                      extra: (
                        <Button
                          size="small"
                          type="text"
                          icon={<DownloadOutlined />}
                          disabled={!selectedStashIds.length}
                          onClick={(event) => {
                            event.stopPropagation();
                            exportSelectedStash();
                          }}
                        >
                          导出
                        </Button>
                      ),
                      children: (
                        <StashListPane
                          items={stashItems}
                          selectedIds={selectedStashIds}
                          filters={{
                            keyword: stashKeyword,
                            source: stashSourceFilter,
                            title: stashTitleFilter,
                          }}
                          onSelectionChange={setSelectedStashIds}
                          onFiltersChange={(filters) =>
                            setFilters({
                              stashKeyword: filters.keyword,
                              stashSourceFilter: filters.source,
                              stashTitleFilter: filters.title,
                            })
                          }
                          compact
                          showSelectedBadge={false}
                          showExportButton={false}
                        />
                      ),
                    },
                  ]}
                />
              </Space>

              <div className="panel-surface thin-scrollbar" style={{ padding: 12, overflow: 'auto', minHeight: 0 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {turns.length ? (
                    <Bubble.List
                      items={bubbleItems}
                      role={{
                        user: { placement: 'end', variant: 'filled' },
                        ai: { placement: 'start', variant: 'shadow' },
                        system: { placement: 'start', variant: 'borderless' },
                      }}
                      autoScroll
                    />
                  ) : (
                    <Empty description="当前会话还没有消息" />
                  )}
                </Space>
              </div>

              <Sender
                value={inputValue}
                loading={sending}
                autoSize={{ minRows: 2, maxRows: 6 }}
                styles={{
                  root: { background: '#ffffff' },
                  content: { background: '#ffffff' },
                  input: { background: '#ffffff' },
                }}
                placeholder="输入问题，或直接基于已选材料提问…"
                onChange={setInputValue}
                onSubmit={(value) => void sendMessage(value)}
              />
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
