import { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Input, Select, Tag, Button, Drawer, Modal, Form, Popconfirm,
  message, Space, Typography, Descriptions,
} from 'antd';
import { SearchOutlined, ReloadOutlined, StopOutlined, CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import {
  fetchAdminUsers, fetchAdminUser, updateAdminUser, disableAdminUser, fetchAdminUserArticles,
} from '@/services/api/admin';
import type { AdminUser } from '@/services/api/admin';

const { Title } = Typography;

const roleOptions = [
  { value: 'user', label: '普通用户' },
  { value: 'editor', label: '编辑' },
  { value: 'admin', label: '管理员' },
];

const statusOptions = [
  { value: 'active', label: '正常' },
  { value: 'disabled', label: '已禁用' },
];

export default function AdminUsers() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userArticles, setUserArticles] = useState<any[]>([]);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminUsers({ page, pageSize, search, role: roleFilter, status: statusFilter });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function openUserDrawer(userId: number) {
    try {
      const [userRes, articlesRes] = await Promise.all([
        fetchAdminUser(userId),
        fetchAdminUserArticles(userId, { page: 1, pageSize: 10 }),
      ]);
      setSelectedUser(userRes.data);
      setUserArticles(articlesRes.data.list);
      setDrawerOpen(true);
    } catch {
      message.error('加载用户详情失败');
    }
  }

  function openEditModal() {
    if (selectedUser) {
      editForm.setFieldsValue({
        role: selectedUser.role,
        status: selectedUser.status,
        phone: selectedUser.phone || null,
        email: selectedUser.email || null,
      });
      setEditModalOpen(true);
    }
  }

  async function handleEditSubmit() {
    try {
      const values = await editForm.validateFields();
      await updateAdminUser(selectedUser.id, values);
      message.success('用户信息已更新');
      setEditModalOpen(false);
      loadUsers();
      // Refresh drawer data
      const userRes = await fetchAdminUser(selectedUser.id);
      setSelectedUser(userRes.data);
    } catch {
      message.error('更新失败');
    }
  }

  async function handleDisable(userId: number) {
    try {
      await disableAdminUser(userId);
      message.success('用户已禁用');
      setDrawerOpen(false);
      loadUsers();
    } catch {
      message.error('操作失败');
    }
  }

  async function handleEnable(userId: number) {
    try {
      await updateAdminUser(userId, { status: 'active' });
      message.success('用户已启用');
      setDrawerOpen(false);
      loadUsers();
    } catch {
      message.error('操作失败');
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '用户名', dataIndex: 'username', ellipsis: true },
    {
      title: '角色', dataIndex: 'role', width: 100,
      render: (role: string) => {
        const colors: Record<string, string> = { admin: 'red', editor: 'blue', user: 'default' };
        const labels: Record<string, string> = { admin: '管理员', editor: '编辑', user: '用户' };
        return <Tag color={colors[role] || 'default'}>{labels[role] || role}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '已禁用'}
        </Tag>
      ),
    },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    { title: '手机', dataIndex: 'phone', ellipsis: true, width: 130 },
    {
      title: '注册时间', dataIndex: 'created_at', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', width: 100,
      render: (_: any, record: AdminUser) => (
        <Button type="link" size="small" onClick={() => openUserDrawer(record.id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>用户管理</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索用户名/邮箱/手机"
            allowClear
            style={{ width: 260 }}
            prefix={<SearchOutlined />}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
          <Select
            placeholder="角色筛选"
            allowClear
            style={{ width: 130 }}
            options={roleOptions}
            value={roleFilter}
            onChange={(v) => { setRoleFilter(v); setPage(1); }}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 130 }}
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadUsers}>刷新</Button>
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

      {/* User Detail Drawer */}
      <Drawer
        title="用户详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={
          selectedUser && (
            <Space>
              <Button icon={<EditOutlined />} onClick={openEditModal}>编辑</Button>
              {selectedUser.status === 'active' ? (
                <Popconfirm title="确定禁用该用户？" onConfirm={() => handleDisable(selectedUser.id)}>
                  <Button danger icon={<StopOutlined />}>禁用</Button>
                </Popconfirm>
              ) : (
                <Popconfirm title="确定启用该用户？" onConfirm={() => handleEnable(selectedUser.id)}>
                  <Button type="primary" icon={<CheckCircleOutlined />}>启用</Button>
                </Popconfirm>
              )}
            </Space>
          )
        }
      >
        {selectedUser && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="ID">{selectedUser.id}</Descriptions.Item>
              <Descriptions.Item label="用户名">{selectedUser.username}</Descriptions.Item>
              <Descriptions.Item label="角色">
                <Tag color={({ admin: 'red', editor: 'blue', user: 'default' } as Record<string, string>)[String(selectedUser.role)]}>
                  {({ admin: '管理员', editor: '编辑', user: '用户' } as Record<string, string>)[String(selectedUser.role)]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedUser.status === 'active' ? 'green' : 'red'}>
                  {selectedUser.status === 'active' ? '正常' : '已禁用'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="手机">{selectedUser.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{selectedUser.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="文章数">{selectedUser.articleCount || 0}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>
            {userArticles.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>最近文章</Title>
                <Table
                  rowKey="id"
                  dataSource={userArticles}
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '标题', dataIndex: 'title', ellipsis: true },
                    { title: '状态', dataIndex: 'status', width: 90,
                      render: (v: string) => <Tag>{v}</Tag>,
                    },
                    { title: '质量分', dataIndex: 'quality_score', width: 80 },
                  ]}
                />
              </>
            )}
          </>
        )}
      </Drawer>

      {/* Edit Modal */}
      <Modal
        title="编辑用户"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalOpen(false)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="role" label="角色">
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="输入手机号" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="输入邮箱" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
