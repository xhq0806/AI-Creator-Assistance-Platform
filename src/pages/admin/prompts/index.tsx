import { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Button, Tag, Modal, Form, Input, Select, Popconfirm,
  message, Space, Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  fetchAdminPrompts, createSystemPrompt, updateAdminPrompt, deleteAdminPrompt,
} from '@/services/api/admin';

const { Title } = Typography;

const visibilityColors: Record<string, string> = {
  private: 'default', team_public: 'blue', system_public: 'green',
};
const visibilityLabels: Record<string, string> = {
  private: '私有', team_public: '团队可见', system_public: '系统公开',
};

const categoryOptions = ['通用', '短图文', '种草', '长文', '视频', '其他'].map((c) => ({ value: c, label: c }));

export default function AdminPrompts() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [form] = Form.useForm();

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPrompts({ page, pageSize });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载 Prompt 列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { loadPrompts(); }, [loadPrompts]);

  function openCreate() {
    setEditingPrompt(null);
    form.resetFields();
    form.setFieldsValue({ category: '通用', visibility: 'system_public' });
    setModalOpen(true);
  }

  function openEdit(prompt: any) {
    setEditingPrompt(prompt);
    form.setFieldsValue({
      name: prompt.name,
      category: prompt.category,
      content: prompt.content,
      visibility: prompt.visibility,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      if (editingPrompt) {
        await updateAdminPrompt(editingPrompt.id, values);
        message.success('Prompt 已更新');
      } else {
        await createSystemPrompt(values);
        message.success('系统 Prompt 已创建');
      }
      setModalOpen(false);
      loadPrompts();
    } catch {
      // form validation error handled by antd
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteAdminPrompt(id);
      message.success('Prompt 已删除');
      loadPrompts();
    } catch {
      message.error('删除失败');
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    {
      title: '分类', dataIndex: 'category', width: 80,
      render: (v: string) => v || '通用',
    },
    {
      title: '所有者', dataIndex: 'owner', width: 100,
      render: (v: any) => v?.username || '系统',
    },
    {
      title: '可见性', dataIndex: 'visibility', width: 100,
      render: (v: string) => (
        <Tag color={visibilityColors[v] || 'default'}>
          {visibilityLabels[v] || v}
        </Tag>
      ),
    },
    {
      title: '使用次数', dataIndex: 'usage_count', width: 80,
    },
    {
      title: '创建时间', dataIndex: 'created_at', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Prompt 模板管理</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建系统 Prompt
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadPrompts}>刷新</Button>
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

      <Modal
        title={editingPrompt ? '编辑 Prompt' : '新建系统 Prompt'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="Prompt 模板名称" maxLength={80} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入 Prompt 内容' }]}>
            <Input.TextArea rows={6} placeholder="Prompt 模板内容" maxLength={10000} showCount />
          </Form.Item>
          <Form.Item name="visibility" label="可见性">
            <Select
              options={[
                { value: 'system_public', label: '系统公开 — 所有用户可见' },
                { value: 'team_public', label: '团队可见' },
                { value: 'private', label: '私有' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
