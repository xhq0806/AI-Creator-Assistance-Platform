import { useState } from "react";
import {
  Button,
  Card,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, HistoryOutlined } from "@ant-design/icons";
import type { PromptTemplate, PromptTemplateVersion } from "@/services/api";
import {
  fetchTemplateVersions,
  restoreTemplateVersion,
} from "@/services/api";
import styles from "../index.less";

type PromptManagerProps = {
  prompts: PromptTemplate[];
  promptName: string;
  setPromptName: (v: string) => void;
  promptCategory: string;
  setPromptCategory: (v: string) => void;
  sharingVisibility: "private" | "team_public";
  setSharingVisibility: (v: "private" | "team_public") => void;
  onSaveAsTemplate: () => void;
  onApplyTemplate: (t: PromptTemplate) => void;
  onDeleteTemplate: (t: PromptTemplate) => void;
  onOpenTeamModal: () => void;
};

export default function PromptManager({
  prompts,
  promptName,
  setPromptName,
  promptCategory,
  setPromptCategory,
  sharingVisibility,
  setSharingVisibility,
  onSaveAsTemplate,
  onApplyTemplate,
  onDeleteTemplate,
  onOpenTeamModal,
}: PromptManagerProps) {
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [currentVersions, setCurrentVersions] = useState<PromptTemplateVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  async function showVersions(template: PromptTemplate) {
    setLoadingVersions(true);
    setVersionModalOpen(true);
    try {
      setCurrentVersions(await fetchTemplateVersions(template.id));
    } catch {
      message.error("加载版本历史失败");
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleRestoreVersion(templateId: number, versionId: number) {
    try {
      await restoreTemplateVersion(templateId, versionId);
      message.success("版本已恢复");
      setVersionModalOpen(false);
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "版本恢复失败");
    }
  }

  return (
    <>
      <Card className={styles.sideCard} title="提示词管理">
        <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
          <Input
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            placeholder="模板名称"
          />
          <Select
            value={promptCategory}
            onChange={setPromptCategory}
            style={{ minWidth: 120 }}
          >
            {["通用", "文章写作", "营销文案", "技术开发", "创意设计", "教育培训", "办公效率", "代码生成"].map(
              (c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              )
            )}
          </Select>
        </Space.Compact>
        <Space.Compact style={{ width: "100%", marginBottom: 12 }}>
          <Select
            value={sharingVisibility}
            onChange={setSharingVisibility}
            style={{ width: "100%" }}
            size="small"
          >
            <Select.Option value="private">私有</Select.Option>
            <Select.Option value="team_public">团队共享</Select.Option>
          </Select>
          <Button size="small" onClick={onOpenTeamModal}>
            团队管理
          </Button>
        </Space.Compact>
        <Button block style={{ marginBottom: 12 }} onClick={onSaveAsTemplate}>
          保存当前提示词为模板
        </Button>
        <Space className={styles.promptList} direction="vertical" size={8}>
          {prompts.map((template) => (
            <Space.Compact key={template.id} style={{ width: "100%" }}>
              <Button
                className={styles.promptButton}
                block
                title={template.content}
                onClick={() => onApplyTemplate(template)}
              >
                <span>
                  [{template.category}] {template.name}
                  {template.visibility === "team_public" && (
                    <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>
                      团队
                    </Tag>
                  )}
                </span>
              </Button>
              {template.user_id && (
                <>
                  <Button
                    icon={<HistoryOutlined />}
                    onClick={() => showVersions(template)}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => onDeleteTemplate(template)}
                  />
                </>
              )}
            </Space.Compact>
          ))}
        </Space>
      </Card>

      <Modal
        title="版本历史"
        open={versionModalOpen}
        onCancel={() => setVersionModalOpen(false)}
        footer={null}
        width={600}
      >
        {loadingVersions ? (
          <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
        ) : currentVersions.length === 0 ? (
          <Typography.Text type="secondary">暂无版本历史</Typography.Text>
        ) : (
          <List
            dataSource={currentVersions}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    size="small"
                    key="restore"
                    onClick={() => handleRestoreVersion(item.template_id, item.id)}
                  >
                    恢复
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Typography.Text strong>v{item.version_no}</Typography.Text>
                      <Typography.Text type="secondary">
                        {item.change_note || "无备注"}
                      </Typography.Text>
                    </Space>
                  }
                  description={item.created_at}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  );
}
