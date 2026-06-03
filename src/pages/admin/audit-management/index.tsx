import { useEffect, useState } from 'react';
import {
  Tabs, Table, Card, Tag, Button, Popconfirm, message, Space, Typography, Select, Switch,
} from 'antd';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  fetchAdminAuditAnnotations, fetchAdminAuditReports, deleteAuditReport,
  fetchAuditCategories, updateAuditCategories,
} from '@/services/api/admin';

const { Title } = Typography;

const riskColors: Record<string, string> = {
  SAFE: 'green', RISK_LOW: 'orange', RISK_MEDIUM: 'volcano', RISK_HIGH: 'red',
};
const categoryColors: Record<string, string> = {
  NONE: 'default', PORN: 'magenta', GAMBLING: 'orange', DRUG: 'red',
  POLITICAL: 'red', VIOLENCE_TERROR: 'red', PRIVACY: 'blue',
  MINOR_RISK: 'purple', FAKE_MARKETING: 'gold', OTHER: 'default',
};

export default function AdminAuditManagement() {
  return (
    <div>
      <Title level={4}>审核管理</Title>
      <Card>
        <Tabs
          defaultActiveKey="annotations"
          items={[
            { key: 'annotations', label: '标注记录', children: <AnnotationsTab /> },
            { key: 'reports', label: '评估报告', children: <ReportsTab /> },
            { key: 'categories', label: '风险分类配置', children: <CategoriesTab /> },
          ]}
        />
      </Card>
    </div>
  );
}

function AnnotationsTab() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  async function load(pageNum = 1, pageSz = 20) {
    setLoading(true);
    try {
      const res = await fetchAdminAuditAnnotations({ page: pageNum, pageSize: pageSz });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page, pageSize); }, [page, pageSize]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 180 },
    {
      title: 'AI 预测', dataIndex: 'ai_prediction_risk', width: 100,
      render: (v: string) => <Tag color={riskColors[v]}>{v}</Tag>,
    },
    {
      title: '人工标注', dataIndex: 'ground_truth_risk', width: 100,
      render: (v: string) => <Tag color={riskColors[v]}>{v}</Tag>,
    },
    {
      title: '风险分类', dataIndex: 'risk_category', width: 100,
      render: (v: string) => <Tag color={categoryColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '标注者', dataIndex: ['annotator', 'username'], width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '标注时间', dataIndex: 'annotated_at', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => load(1, pageSize)}>刷新</Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </div>
  );
}

function ReportsTab() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  async function load(pageNum = 1, pageSz = 20) {
    setLoading(true);
    try {
      const res = await fetchAdminAuditReports({ page: pageNum, pageSize: pageSz });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page, pageSize); }, [page, pageSize]);

  async function handleDelete(id: number) {
    try {
      await deleteAuditReport(id);
      message.success('报告已删除');
      load(page, pageSize);
    } catch {
      message.error('删除失败');
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '样本数', dataIndex: 'total_samples', width: 80 },
    {
      title: '准确率', dataIndex: 'accuracy', width: 80,
      render: (v: number) => v ? `${(v * 100).toFixed(1)}%` : '-',
    },
    {
      title: '精确率', dataIndex: 'precision', width: 80,
      render: (v: number) => v ? `${(v * 100).toFixed(1)}%` : '-',
    },
    {
      title: '召回率', dataIndex: 'recall', width: 80,
      render: (v: number) => v ? `${(v * 100).toFixed(1)}%` : '-',
    },
    {
      title: 'F1', dataIndex: 'f1_score', width: 80,
      render: (v: number) => v?.toFixed(3) || '-',
    },
    {
      title: '生成者', dataIndex: ['user', 'username'], width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '创建时间', dataIndex: 'created_at', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', width: 80,
      render: (_: any, record: any) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => load(1, pageSize)}>刷新</Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<{ key: string; label: string; enabled: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAuditCategories();
      setCategories(res.data.categories);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(key: string, enabled: boolean) {
    const next = categories.map((c) => (c.key === key ? { ...c, enabled } : c));
    setCategories(next);
    try {
      await updateAuditCategories({ categories: next });
      message.success('已更新');
    } catch {
      message.error('保存失败');
      load();
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      </Space>
      <Table
        rowKey="key"
        dataSource={categories}
        loading={loading}
        pagination={false}
        columns={[
          { title: '分类标识', dataIndex: 'key', width: 180 },
          { title: '显示名称', dataIndex: 'label', width: 150 },
          {
            title: '启用状态', dataIndex: 'enabled', width: 120,
            render: (v: boolean, record: { key: string; enabled: boolean }) => (
              <Switch
                checked={v}
                onChange={(checked) => handleToggle(record.key, checked)}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            ),
          },
        ]}
      />
    </div>
  );
}
