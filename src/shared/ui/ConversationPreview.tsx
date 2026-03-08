import { Bubble } from '@ant-design/x';
import { Empty } from 'antd';
import { useMemo } from 'react';

import type { ConversationTurn } from '../types';
import { MarkdownMessage } from './MarkdownMessage';

type Props = {
  turns: ConversationTurn[];
};

export function ConversationPreview({ turns }: Props) {
  const items = useMemo(
    () =>
      turns.map((turn) => ({
        key: turn.id,
        role: turn.role === 'assistant' ? 'ai' : turn.role,
        content: <MarkdownMessage parts={turn.parts} />,
        loading: turn.streamState === 'streaming',
      })),
    [turns],
  );

  if (!turns.length) {
    return <Empty description="暂无消息" />;
  }

  return (
    <Bubble.List
      items={items}
      role={{
        user: { placement: 'end', variant: 'filled' },
        ai: { placement: 'start', variant: 'shadow' },
        system: { placement: 'start', variant: 'borderless' },
      }}
      autoScroll
    />
  );
}
