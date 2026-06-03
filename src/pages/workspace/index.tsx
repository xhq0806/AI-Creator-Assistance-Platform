import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { TabsProps, UploadProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { history, useModel } from "umi";
import {
  createMaterial,
  createPromptTemplate,
  deleteMaterial,
  deletePromptTemplate,
  fetchMaterials,
  fetchPromptTemplates,
  getUploadCredential,
  confirmUpload,
  updatePromptTemplate,
  type MaterialItem,
  type PromptTemplate,
} from "@/services/api";
import styles from "../profile/index.less";

const CATEGORIES = ["通用", "短图文", "种草", "长文", "视频", "其他"];

function PromptsTab() {
  const [messageApi, contextHolder] = message.useMessage();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  async function loadPrompts() {
    setLoading(true);
    try {
      setPrompts(await fetchPromptTemplates());
    } catch {
      messageApi.error("加载模板列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrompts();
  }, []);

  function openCreate() {
    setEditingPrompt(null);
    form.resetFields();
    form.setFieldsValue({ category: "通用" });
    setModalOpen(true);
  }

  function openEdit(prompt: PromptTemplate) {
    setEditingPrompt(prompt);
    form.setFieldsValue({
      name: prompt.name,
      category: prompt.category,
      content: prompt.content,
    });
    setModalOpen(true);
  }

  async function handleSave(values: {
    name: string;
    category: string;
    content: string;
  }) {
    setSubmitting(true);
    try {
      if (editingPrompt) {
        await updatePromptTemplate(editingPrompt.id, values);
        messageApi.success("模板已更新");
      } else {
        await createPromptTemplate(values);
        messageApi.success("模板已创建");
      }
      setModalOpen(false);
      loadPrompts();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deletePromptTemplate(id);
      messageApi.success("模板已删除");
      loadPrompts();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  const columns: ColumnsType<PromptTemplate> = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "名称", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      width: 80,
      align: "center",
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "可见性",
      dataIndex: "visibility",
      key: "visibility",
      width: 80,
      align: "center",
      render: (v: string) => {
        const labels: Record<string, string> = {
          private: "私有",
          team_public: "团队",
          system_public: "系统",
        };
        return (
          <Tag color={v === "system_public" ? "blue" : "default"}>
            {labels[v] || v}
          </Tag>
        );
      },
    },
    {
      title: "使用次数",
      dataIndex: "usage_count",
      key: "usage_count",
      width: 110,
      align: "center",
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      align: "center",
      render: (_: unknown, record: PromptTemplate) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除此模板？"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建模板
        </Button>
      </div>
      <Table
        dataSource={prompts}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (record) => (
            <Typography.Paragraph
              type="secondary"
              style={{ margin: 0, whiteSpace: "pre-wrap" }}
            >
              {record.content}
            </Typography.Paragraph>
          ),
        }}
      />
      <Modal
        title={editingPrompt ? "编辑模板" : "新建模板"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: "请输入模板名称" }]}
          >
            <Input placeholder="如：信息增量短图文" maxLength={80} />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: "请选择分类" }]}
          >
            <Select options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item
            name="content"
            label="模板内容（Prompt）"
            rules={[{ required: true, message: "请输入模板内容" }]}
          >
            <Input.TextArea rows={6} placeholder="描述 AI 应如何生成内容" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {editingPrompt ? "保存修改" : "创建模板"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

function MaterialsTab() {
  const [messageApi, contextHolder] = message.useMessage();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  async function loadMaterials() {
    setLoading(true);
    try {
      setMaterials(await fetchMaterials());
    } catch {
      messageApi.error("加载素材列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  async function handleDelete(id: number) {
    try {
      await deleteMaterial(id);
      messageApi.success("素材已删除");
      loadMaterials();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  async function handleCreateByUrl(values: { name: string; url: string }) {
    setCreating(true);
    try {
      await createMaterial(values);
      messageApi.success("素材已添加");
      setUploadModalOpen(false);
      createForm.resetFields();
      loadMaterials();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setCreating(false);
    }
  }

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    beforeUpload: async (file) => {
      setUploading(true);
      try {
        const cred = await getUploadCredential({
          file_name: file.name,
          file_type: file.type,
        });

        if (cred.provider === "mock_demo") {
          // Mock 模式：直接 POST 文件到后端本地存储
          const token = (() => {
            try {
              const raw = window.localStorage.getItem("ai_creator_user");
              return raw ? JSON.parse(raw).token || "" : "";
            } catch {
              return "";
            }
          })();
          const uploadResponse = await fetch(
            `${cred.upload_url}?material_id=${cred.material_id}&file_name=${encodeURIComponent(file.name)}`,
            {
              method: "POST",
              body: file,
              headers: {
                "Content-Type": file.type || "application/octet-stream",
                Authorization: token ? `Bearer ${token}` : "",
              },
            }
          );
          if (!uploadResponse.ok) throw new Error("上传失败");
        } else {
          // 云存储模式：PUT 到预签名 URL 后通知后端确认
          const uploadResponse = await fetch(cred.upload_url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });
          if (!uploadResponse.ok) throw new Error("上传失败");
          await confirmUpload({
            material_id: cred.material_id!,
            file_size: file.size,
            mime_type: file.type,
          });
        }

        messageApi.success(`素材 "${file.name}" 上传成功`);
        loadMaterials();
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : "上传失败");
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  const columns: ColumnsType<MaterialItem> = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "预览",
      dataIndex: "url",
      key: "preview",
      width: 80,
      render: (url: string) =>
        url ? (
          <Image
            src={url}
            width={48}
            height={48}
            style={{ objectFit: "cover", borderRadius: 4 }}
          />
        ) : (
          "-"
        ),
    },
    { title: "名称", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "类型",
      dataIndex: "media_type",
      key: "media_type",
      width: 80,
      render: (v: string) => {
        const labels: Record<string, string> = {
          image: "图片",
          video: "视频",
          audio: "音频",
        };
        return <Tag>{labels[v] || v}</Tag>;
      },
    },
    {
      title: "审核状态",
      dataIndex: "risk_status",
      key: "risk_status",
      width: 100,
      render: (v: string) => (
        <Tag color={v === "approved" ? "green" : "red"}>
          {v === "approved" ? "已通过" : "已驳回"}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      align: "center",
      render: (_: unknown, record: MaterialItem) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Popconfirm
            title="确定删除该素材？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Upload {...uploadProps}>
            <Button icon={<InboxOutlined />} loading={uploading}>
              上传素材
            </Button>
          </Upload>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setUploadModalOpen(true)}
          >
            通过 URL 添加
          </Button>
        </Space>
      </div>
      <Table
        dataSource={materials}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title="通过 URL 添加素材"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateByUrl}>
          <Form.Item
            name="name"
            label="素材名称"
            rules={[{ required: true, message: "请输入素材名称" }]}
          >
            <Input placeholder="如：封面图片" maxLength={120} />
          </Form.Item>
          <Form.Item
            name="url"
            label="素材 URL"
            rules={[
              { required: true, message: "请输入素材地址" },
              { type: "url", message: "请输入有效的 URL" },
            ]}
          >
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={creating}>
            添加素材
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

export default function WorkspacePage() {
  const { currentUser } = useModel("auth");

  if (!currentUser) {
    history.push("/login");
    return null;
  }

  const items: TabsProps["items"] = [
    { key: "prompts", label: "Prompt 模板管理", children: <PromptsTab /> },
    { key: "materials", label: "素材库管理", children: <MaterialsTab /> },
  ];

  return (
    <div className={styles.profilePage}>
      <Card className={styles.panel}>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>
          资源工作台
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          管理你的 Prompt 模板与素材库，支持新建、编辑、删除、上传等操作。
        </Typography.Paragraph>
        <Tabs items={items} />
      </Card>
    </div>
  );
}
