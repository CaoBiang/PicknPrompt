import { describe, expect, it, vi } from 'vitest';

import { OpenAIResponsesGateway } from './openai-responses-gateway';

describe('OpenAIResponsesGateway', () => {
  it('maps stream deltas to model events', async () => {
    const gateway = new OpenAIResponsesGateway();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          [
            'event: response.created\n',
            'data: {"type":"response.created","response":{"id":"resp_1"}}\n\n',
            'event: response.output_text.delta\n',
            'data: {"type":"response.output_text.delta","delta":"你好"}\n\n',
            'event: response.completed\n',
            'data: {"type":"response.completed"}\n\n',
          ].join(''),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        ),
      ),
    );

    const events: string[] = [];
    for await (const event of gateway.sendStream({
      modelConfig: {
        id: 'm1',
        name: 'Demo',
        baseUrl: 'https://example.com',
        apiKey: 'secret',
        model: 'gpt-4.1',
        supportsVision: true,
        enabled: true,
        status: 'untested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      assistant: {
        id: 'a1',
        name: 'Default',
        systemPrompt: 'help',
        isDefault: true,
        isQuickAssistant: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      history: [],
      stashItems: [],
      userPrompt: 'hello',
    })) {
      events.push(event.type === 'text-delta' ? event.delta : event.type);
    }

    expect(events).toEqual(['response-created', '你好', 'completed']);
  });
});
