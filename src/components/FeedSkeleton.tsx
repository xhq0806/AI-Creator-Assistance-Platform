import { Card, Skeleton, Space } from 'antd';

export default function FeedSkeleton() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <Skeleton active avatar paragraph={{ rows: 3 }} />
        </Card>
      ))}
    </Space>
  );
}
