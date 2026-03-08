import XStream from '@ant-design/x-sdk/es/x-stream';

import type {
  ConnectionTestResult,
  MessagePart,
  ModelConfig,
  ModelEvent,
  ModelGateway,
  ModelGatewayInput,
} from '../types';
import { buildResponsesUrl } from '../utils/url';

function partToResponseInput(part: MessagePart) {
  if (part.type === 'text') {
    return {
      type: 'input_text',
      text: part.text,
    };
  }

  const imageUrl = part.previewUrl || part.sourceUrl;
  if (!imageUrl) {
    return null;
  }

  return {
    type: 'input_image',
    image_url: imageUrl,
  };
}

function turnToResponseInput(turn: ModelGatewayInput['history'][number]) {
  const content = turn.parts.map(partToResponseInput).filter(Boolean);
  return {
    role: turn.role,
    content,
  };
}

function currentInputToResponseInput(input: ModelGatewayInput) {
  const content: Array<{ type: 'input_text'; text: string } | { type: 'input_image'; image_url: string }> = [];

  input.stashItems.forEach((item, index) => {
    content.push({
      type: 'input_text',
      text:
        item.type === 'text'
          ? `材料 ${index + 1}\n来源标题：${item.sourceTitle}\n来源链接：${item.sourceUrl}\n内容：\n${item.textContent || ''}`
          : `材料 ${index + 1}\n来源标题：${item.sourceTitle}\n来源链接：${item.sourceUrl}\n图片说明：${item.captureMeta.alt || '网页图片'}`,
    });

    if (item.type === 'image' && (item.previewUrl || item.sourceUrl)) {
      content.push({
        type: 'input_image',
        image_url: item.previewUrl || item.sourceUrl || '',
      });
    }
  });

  content.push({
    type: 'input_text',
    text: input.userPrompt,
  });

  return {
    role: 'user',
    content,
  };
}

async function parseError(response: Response) {
  try {
    const errorJson = await response.json();
    return JSON.stringify(errorJson);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

function buildHeaders(modelConfig: ModelConfig) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${modelConfig.apiKey}`,
  };
}

export class OpenAIResponsesGateway implements ModelGateway {
  async testConnection(modelConfig: ModelConfig): Promise<ConnectionTestResult> {
    try {
      const response = await fetch(buildResponsesUrl(modelConfig.baseUrl), {
        method: 'POST',
        headers: buildHeaders(modelConfig),
        body: JSON.stringify({
          model: modelConfig.model,
          instructions: 'Reply with exactly OK.',
          stream: false,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: 'ping',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        return {
          ok: false,
          message: await parseError(response),
        };
      }

      return {
        ok: true,
        message: '连接成功',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  async *sendStream(input: ModelGatewayInput): AsyncIterable<ModelEvent> {
    const response = await fetch(buildResponsesUrl(input.modelConfig.baseUrl), {
      method: 'POST',
      headers: buildHeaders(input.modelConfig),
      signal: input.signal,
      body: JSON.stringify({
        model: input.modelConfig.model,
        instructions: input.assistant.systemPrompt,
        stream: true,
        input: [...input.history.map(turnToResponseInput), currentInputToResponseInput(input)],
      }),
    });

    if (!response.ok || !response.body) {
      yield {
        type: 'error',
        message: await parseError(response),
      };
      return;
    }

    const stream = XStream({ readableStream: response.body });

    for await (const chunk of stream) {
      const rawData = typeof chunk.data === 'string' ? chunk.data.trim() : chunk.data;
      if (!rawData || rawData === '[DONE]') {
        continue;
      }

      let eventPayload: { type?: string; delta?: string; response?: { id?: string } } | undefined;
      if (typeof rawData === 'string') {
        try {
          eventPayload = JSON.parse(rawData) as { type?: string; delta?: string; response?: { id?: string } };
        } catch {
          continue;
        }
      } else {
        eventPayload = rawData as { type?: string; delta?: string; response?: { id?: string } };
      }

      if (!eventPayload?.type) {
        continue;
      }

      if (eventPayload.type === 'response.created') {
        yield {
          type: 'response-created',
          id: eventPayload.response?.id || '',
        };
        continue;
      }

      if (eventPayload.type === 'response.output_text.delta' && eventPayload.delta) {
        yield {
          type: 'text-delta',
          delta: eventPayload.delta,
        };
        continue;
      }

      if (eventPayload.type === 'response.completed') {
        yield {
          type: 'completed',
        };
        return;
      }

      if (eventPayload.type === 'error') {
        yield {
          type: 'error',
          message: JSON.stringify(eventPayload),
        };
        return;
      }
    }
  }
}

export const openAIResponsesGateway = new OpenAIResponsesGateway();
