import { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Button, Tag, Modal, Form, Input, Select, Popconfirm,
  message, Space, Typography,
} from 'antd';
import { ReloadOutlined, WarningOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchAdminMaterials, overrideMaterialRisk } from '@/services/api/admin';

const { Title } = Typography;

export default function AdminMaterials() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [riskStatusFilter, setRiskStatusFilter] = useState<string | undefined>();

  // Override modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('approved');
  const [overrideReason, setOverrideReason] = useState('');

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminMaterials({ page, pageSize, riskStatus: riskStatusFilter });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载素材列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, riskStatusFilter]);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  function openOverride(material: any) {
    setSelectedMaterial(material);
    setOverrideStatus('approved');
    setOverrideReason('');
    setModalOpen(true);
  }

  async function handleOverride() {
    if (!selectedMaterial) return;
    try {
      await overrideMaterialRisk(selectedMaterial.id, {
        riskStatus: overrideStatus,
        reason: overrideReason || undefined,
      });
      message.success('风险状态已更新');
      setModalOpen(false);
      loadMaterials();
    } catch {
      message.error('操作失败');
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    {
      title: '类型', dataIndex: 'media_type', width: 80,
      render: (v: string) => ({ image: '图片', video: '视频', audio: '音频' }[v] || v),
    },
    {
      title: '所有者', dataIndex: ['owner', 'username'], width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '风险状态', dataIndex: 'risk_status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'approved' ? 'green' : 'red'}>
          {v === 'approved' ? '已通过' : '已拒绝'}
        </Tag>
      ),
    },
    {
      title: '上传状态', dataIndex: 'upload_status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'done' ? 'green' : 'orange'}>
          {v === 'done' ? '已完成' : v || '-'}
        </Tag>
      ),
    },
    {
      title: '文件大小', dataIndex: 'file_size', width: 90,
      render: (v: number) => v ? `${(v / 1024).toFixed(1)} KB` : '-',
    },
    {
      title: '创建时间', dataIndex: 'created_at', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<WarningOutlined />}
            onClick={() => openOverride(record)}>
            风险覆盖
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>素材管理</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="风险状态筛选"
            allowClear
            style={{ width: 150 }}
            value={riskStatusFilter}
            onChange={(v) => { setRiskStatusFilter(v); setPage(1); }}
            options={[
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已拒绝' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadMaterials}>刷新</Button>
        </Space>
      </Card>
      <Card>
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
      </Card>

      {/* Risk Override Modal */}
      <Modal
        title="风险状态覆盖"
        open={modalOpen}
        onOk={handleOverride}
        onCancel={() => setModalOpen(false)}
      >
        {selectedMaterial && (
          <>
            <p style={{ marginBottom: 16 }}>
              素材：<strong>{selectedMaterial.name}</strong>
            </p>
            <p style={{ marginBottom: 16 }}>
              当前状态：
              <Tag color={selectedMaterial.risk_status === 'approved' ? 'green' : 'red'}>
                {selectedMaterial.risk_status === 'approved' ? '已通过' : '已拒绝'}
              </Tag>
            </p>
            <Form layout="vertical">
              <Form.Item label="新风险状态" required>
                <Select
                  value={overrideStatus}
                  onChange={setOverrideStatus}
                  options={[
                    { value: 'approved', label: '通过 (approved)' },
                    { value: 'rejected', label: '拒绝 (rejected)' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="覆盖原因">
                <Input.TextArea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="可选：说明覆盖原因"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
