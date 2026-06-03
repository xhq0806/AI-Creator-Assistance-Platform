import { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Input, Select, Tag, Button, Modal, Popconfirm,
  message, Space, Typography, Drawer, Descriptions, DatePicker,
} from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, StopOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import {
  fetchAdminArticles, reviewAdminArticle, forceWithdrawArticle,
  forceDeleteArticle, fetchArticleAnalytics,
} from '@/services/api/admin';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const statusColors: Record<string, string> = {
  draft: 'default', pending_review: 'orange', published: 'green',
  rejected: 'red', withdrawn: 'volcano',
};
const statusLabels: Record<string, string> = {
  draft: '草稿', pending_review: '待审核', published: '已发布',
  rejected: '已驳回', withdrawn: '已撤回',
};

export default function AdminArticles() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewArticle, setReviewArticle] = useState<any>(null);
  const [reviewReason, setReviewReason] = useState('');

  // Analytics drawer
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminArticles({ page, pageSize, status: statusFilter, category: categoryFilter });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载文章列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, categoryFilter]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  async function handleReview(action: 'approve' | 'reject') {
    if (!reviewArticle) return;
    try {
      await reviewAdminArticle(reviewArticle.id, { action, reason: reviewReason || undefined });
      message.success(action === 'approve' ? '文章已通过审核' : '文章已驳回');
      setReviewModalOpen(false);
      setReviewReason('');
      loadArticles();
    } catch {
      message.error('操作失败');
    }
  }

  async function handleWithdraw(id: number) {
    try {
      await forceWithdrawArticle(id);
      message.success('文章已撤回');
      loadArticles();
    } catch {
      message.error('操作失败');
    }
  }

  async function handleDelete(id: number) {
    try {
      await forceDeleteArticle(id);
      message.success('文章已删除');
      loadArticles();
    } catch {
      message.error('删除失败');
    }
  }

  async function openAnalytics(id: number) {
    try {
      const res = await fetchArticleAnalytics(id);
      setAnalytics(res.data);
      setAnalyticsOpen(true);
    } catch {
      message.error('加载文章数据失败');
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '标题', dataIndex: 'title', ellipsis: true, width: 200,
    },
    {
      title: '作者', dataIndex: ['author', 'username'], width: 100,
      render: (v: string, record: any) => record.author?.username || '-',
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag>,
    },
    {
      title: '分类', dataIndex: 'category', width: 80,
      render: (v: string) => v || '通用',
    },
    {
      title: '质量分', dataIndex: 'quality_score', width: 80,
      render: (v: number) => (v || 0).toFixed(1),
    },
    {
      title: '浏览量', dataIndex: 'view_count', width: 80,
      render: (v: number) => v || 0,
    },
    {
      title: '发布时间', dataIndex: 'created_at', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', width: 220, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {record.status === 'pending_review' && (
            <>
              <Button type="link" size="small" icon={<CheckOutlined />}
                onClick={() => { setReviewArticle(record); setReviewModalOpen(true); }}>
                审核
              </Button>
            </>
          )}
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => openAnalytics(record.id)}>
            数据
          </Button>
          {record.status === 'published' && (
            <Popconfirm title="确定撤回该文章？" onConfirm={() => handleWithdraw(record.id)}>
              <Button type="link" size="small" danger icon={<StopOutlined />}>撤回</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确定永久删除该文章？此操作不可撤销" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>文章管理</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 130 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 130 }}
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setPage(1); }}
            options={['通用', '科技', '生活', '娱乐', '教育', '财经', '体育', '游戏'].map((c) => ({ value: c, label: c }))}
          />
          <Button icon={<ReloadOutlined />} onClick={loadArticles}>刷新</Button>
        </Space>
      </Card>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      {/* Review Modal */}
      <Modal
        title="文章审核"
        open={reviewModalOpen}
        onCancel={() => { setReviewModalOpen(false); setReviewReason(''); }}
        width={680}
        footer={[
          <Button key="cancel" onClick={() => { setReviewModalOpen(false); setReviewReason(''); }}>取消</Button>,
          <Button key="reject" danger icon={<CloseOutlined />} onClick={() => handleReview('reject')}>驳回</Button>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={() => handleReview('approve')}>通过</Button>,
        ]}
      >
        {reviewArticle && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="标题">{reviewArticle.title}</Descriptions.Item>
              <Descriptions.Item label="作者">{reviewArticle.author?.username || '-'}</Descriptions.Item>
              <Descriptions.Item label="分类">{reviewArticle.category || '通用'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[reviewArticle.status]}>{statusLabels[reviewArticle.status]}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ maxHeight: 300, overflow: 'auto', background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Paragraph>{reviewArticle.content}</Paragraph>
            </div>
            <Input.TextArea
              placeholder="审核意见（可选）"
              rows={3}
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
            />
          </>
        )}
      </Modal>

      {/* Analytics Drawer */}
      <Drawer
        title="文章数据"
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        width={480}
      >
        {analytics && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="标题">{analytics.title}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColors[analytics.status]}>{statusLabels[analytics.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="浏览量">{analytics.views}</Descriptions.Item>
            <Descriptions.Item label="点赞">{analytics.likes}</Descriptions.Item>
            <Descriptions.Item label="收藏">{analytics.favorites}</Descriptions.Item>
            <Descriptions.Item label="踩">{analytics.negatives}</Descriptions.Item>
            <Descriptions.Item label="质量分">{analytics.quality_score?.toFixed(1)}</Descriptions.Item>
            <Descriptions.Item label="AI 排名分">{analytics.ai_rank_score?.toFixed(1)}</Descriptions.Item>
            <Descriptions.Item label="AI 排名理由">{analytics.ai_rank_reason || '-'}</Descriptions.Item>
            <Descriptions.Item label="版本数">{analytics.versionCount}</Descriptions.Item>
            <Descriptions.Item label="反馈数">{analytics.feedbackCount}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {analytics.created_at ? new Date(analytics.created_at).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
