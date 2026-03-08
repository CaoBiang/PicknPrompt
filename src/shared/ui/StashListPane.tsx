import { DeleteOutlined, DownloadOutlined, PictureOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Empty, Input, List, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import { exportStashItemsToMarkdown } from '../import-export/stash-markdown';
import type { StashItem } from '../types';
import { downloadBytes } from '../utils/download';

type Filters = {
  keyword: string;
  source: string;
  title: string;
};

type Props = {
  items: StashItem[];
  selectedIds: string[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onDeleteSelected?: (ids: string[]) => Promise<void>;
  compact?: boolean;
  showSelectedBadge?: boolean;
  showExportButton?: boolean;
};

export function StashListPane({
  items,
  selectedIds,
  filters,
  onFiltersChange,
  onSelectionChange,
  onDeleteSelected,
  compact,
  showSelectedBadge = true,
  showExportButton = true,
}: Props) {
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const keyword = filters.keyword.trim().toLowerCase();
      const source = filters.source.trim().toLowerCase();
      const title = filters.title.trim().toLowerCase();
      const text = `${item.textContent || ''} ${item.sourceTitle} ${item.sourceUrl}`.toLowerCase();

      return (!keyword || text.includes(keyword))
        && (!source || item.sourceUrl.toLowerCase().includes(source))
        && (!title || item.sourceTitle.toLowerCase().includes(title));
    });
  }, [filters.keyword, filters.source, filters.title, items]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );

  const handleExport = () => {
    if (!selectedItems.length) {
      return;
    }
    const result = exportStashItemsToMarkdown(selectedItems);
    downloadBytes(result.filename, result.mimeType, result.bytes);
  };

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
      return;
    }
    onSelectionChange(selectedIds.filter((itemId) => itemId !== id));
  };

  return (
    <Space direction="vertical" size={compact ? 8 : 12} style={{ width: '100%' }}>
      <Space wrap style={{ width: '100%' }}>
        <Input
          placeholder="关键词"
          value={filters.keyword}
          onChange={(event) => onFiltersChange({ ...filters, keyword: event.target.value })}
          style={{ width: compact ? 140 : 180 }}
        />
        <Input
          placeholder="来源 URL"
          value={filters.source}
          onChange={(event) => onFiltersChange({ ...filters, source: event.target.value })}
          style={{ width: compact ? 140 : 200 }}
        />
        <Input
          placeholder="标题"
          value={filters.title}
          onChange={(event) => onFiltersChange({ ...filters, title: event.target.value })}
          style={{ width: compact ? 120 : 180 }}
        />
      </Space>

      {showSelectedBadge || showExportButton || onDeleteSelected ? (
        <Space wrap>
          {showSelectedBadge ? <Tag color="blue">已选 {selectedIds.length}</Tag> : null}
          {showExportButton ? (
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!selectedItems.length}>
              导出选中
            </Button>
          ) : null}
          {onDeleteSelected ? (
          <Button danger icon={<DeleteOutlined />} onClick={() => void onDeleteSelected(selectedIds)} disabled={!selectedIds.length}>
            删除选中
          </Button>
          ) : null}
        </Space>
      ) : null}

      <List
        locale={{ emptyText: <Empty description="暂无暂存内容" /> }}
        dataSource={filteredItems}
        renderItem={(item) => (
          <List.Item>
            <Card size="small" style={{ width: '100%' }}>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space align="start">
                  <Checkbox checked={selectedIds.includes(item.id)} onChange={(event) => handleToggle(item.id, event.target.checked)} />
                  {item.type === 'text' ? <FileTextOutlined /> : <PictureOutlined />}
                </Space>
                <Tag>{item.type === 'text' ? '文本' : '图片'}</Tag>
              </Space>
              <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 8 }}>
                {item.sourceTitle}
              </Typography.Title>
              <Typography.Paragraph type="secondary" ellipsis={{ rows: item.type === 'text' ? 3 : 1 }} style={{ marginBottom: 8 }}>
                {item.type === 'text' ? item.textContent : item.captureMeta.alt || item.sourceUrl}
              </Typography.Paragraph>
              {item.type === 'image' && (item.previewUrl || item.sourceUrl) ? (
                <img
                  src={item.previewUrl || item.sourceUrl}
                  alt={item.captureMeta.alt || item.sourceTitle}
                  style={{ width: '100%', maxHeight: compact ? 120 : 180, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }}
                />
              ) : null}
              <Typography.Link href={item.sourceUrl} target="_blank" rel="noreferrer">
                {item.sourceUrl}
              </Typography.Link>
            </Card>
          </List.Item>
        )}
      />
    </Space>
  );
}
