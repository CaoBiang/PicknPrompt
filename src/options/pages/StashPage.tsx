import { Space, Typography } from 'antd';
import { useCallback, useState } from 'react';

import { useLiveReload } from '../../shared/hooks/use-live-reload';
import { notifyDataChanged } from '../../shared/messaging';
import { stashRepository } from '../../shared/repositories';
import type { StashItem } from '../../shared/types';
import { StashListPane } from '../../shared/ui/StashListPane';

export function StashPage() {
  const [items, setItems] = useState<StashItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({ keyword: '', source: '', title: '' });

  useLiveReload(
    useCallback(async () => {
      setItems(await stashRepository.list());
    }, []),
  );

  const deleteSelected = async (ids: string[]) => {
    await Promise.all(ids.map((id) => stashRepository.remove(id)));
    setSelectedIds([]);
    await notifyDataChanged({ entity: 'stash', action: 'delete' });
    setItems(await stashRepository.list());
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>暂存区总览</Typography.Title>
      <StashListPane items={items} selectedIds={selectedIds} filters={filters} onSelectionChange={setSelectedIds} onFiltersChange={setFilters} onDeleteSelected={deleteSelected} />
    </Space>
  );
}
