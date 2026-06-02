import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { TabsProps } from "antd";
import { history, useModel } from "umi";
import {
  createAuditAnnotation,
  deleteAuditAnnotation,
  fetchAuditAnnotations,
  fetchAuditReportDetail,
  fetchAuditReports,
  generateAuditReport,
  seedAuditSamples,
} from "@/services/api";
import type {
  AuditManualAnnotationItem,
  AuditEvaluationReportItem,
} from "@/services/api";
import styles from "../profile/index.less";

const riskColors: Record<string, string> = {
  SAFE: "green",
  RISK_LOW: "orange",
  RISK_MEDIUM: "volcano",
  RISK_HIGH: "red",
};

const categoryLabels: Record<string, string> = {
  NONE: "无",
  PORN: "色情",
  GAMBLING: "赌博",
  DRUG: "毒品",
  POLITICAL: "政治敏感",
  VIOLENCE_TERROR: "暴力恐怖",
  PRIVACY: "隐私泄露",
  MINOR_RISK: "未成年风险",
  FAKE_MARKETING: "虚假营销",
  OTHER: "其他",
};

function AnnotationsTab() {
  const [messageApi, contextHolder] = message.useMessage();
  const [annotations, setAnnotations] = useState<AuditManualAnnotationItem[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  async function loadAnnotations() {
    setLoading(true);
    try {
      const data = await fetchAuditAnnotations();
      setAnnotations(data.list);
    } catch {
      messageApi.error("加载标注列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnotations();
  }, []);

  async function handleCreate(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await createAuditAnnotation(values as any);
      messageApi.success("标注已创建");
      form.resetFields();
      loadAnnotations();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "创建标注失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSeed(clearExisting: boolean) {
    setSeeding(true);
    try {
      const result = await seedAuditSamples(clearExisting);
      messageApi.success(`已创建 ${result.created} 条种子标注样本`);
      loadAnnotations();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "生成种子样本失败");
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteAuditAnnotation(id);
      messageApi.success("已删除");
      loadAnnotations();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "标题", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "AI 预测",
      dataIndex: "ai_prediction_risk",
      key: "ai_prediction_risk",
      render: (v: string) => <Tag color={riskColors[v] || "default"}>{v}</Tag>,
    },
    {
      title: "真实风险",
      dataIndex: "ground_truth_risk",
      key: "ground_truth_risk",
      render: (v: string) => <Tag color={riskColors[v] || "default"}>{v}</Tag>,
    },
    {
      title: "风险类别",
      dataIndex: "risk_category",
      key: "risk_category",
      render: (v: string) => categoryLabels[v] || v,
    },
    {
      title: "标注时间",
      dataIndex: "annotated_at",
      key: "annotated_at",
      width: 160,
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_: unknown, record: AuditManualAnnotationItem) => (
        <Popconfirm
          title="确定删除该标注记录？"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button type="link" danger size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Popconfirm
            title="追加种子样本（保留已有标注）"
            onConfirm={() => handleSeed(false)}
          >
            <Button loading={seeding}>追加种子样本</Button>
          </Popconfirm>
          <Popconfirm
            title="清空全部标注并重新生成 46 条种子样本，确定继续？"
            onConfirm={() => handleSeed(true)}
          >
            <Button danger loading={seeding}>
              重置并生成种子样本
            </Button>
          </Popconfirm>
        </Space>
      </div>
      <Card title="新增标注" size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label="内容标题"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input placeholder="输入待审核内容标题" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容正文"
            rules={[{ required: true, message: "请输入正文" }]}
          >
            <Input.TextArea rows={6} placeholder="输入待审核内容正文" />
          </Form.Item>
          <Form.Item
            name="ai_prediction_risk"
            label="AI 预测风险等级"
            rules={[{ required: true, message: "请选择 AI 预测结果" }]}
          >
            <Select
              options={[
                { label: "安全 SAFE", value: "SAFE" },
                { label: "低风险 RISK_LOW", value: "RISK_LOW" },
                { label: "中风险 RISK_MEDIUM", value: "RISK_MEDIUM" },
                { label: "高风险 RISK_HIGH", value: "RISK_HIGH" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="ground_truth_risk"
            label="真实风险等级（人工判定）"
            rules={[{ required: true, message: "请选择人工判定结果" }]}
          >
            <Select
              options={[
                { label: "安全 SAFE", value: "SAFE" },
                { label: "低风险 RISK_LOW", value: "RISK_LOW" },
                { label: "中风险 RISK_MEDIUM", value: "RISK_MEDIUM" },
                { label: "高风险 RISK_HIGH", value: "RISK_HIGH" },
              ]}
            />
          </Form.Item>
          <Form.Item name="risk_category" label="风险类别">
            <Select
              defaultValue="NONE"
              options={Object.entries(categoryLabels).map(([k, v]) => ({
                label: v,
                value: k,
              }))}
            />
          </Form.Item>
          <Form.Item name="annotation_note" label="标注备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            提交标注
          </Button>
        </Form>
      </Card>
      <Table
        dataSource={annotations}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}

function formatPct(v: number | undefined) {
  if (v === undefined || v === null) return "-";
  return `${(v * 100).toFixed(1)}%`;
}

function ReportDetailModal({
  reportId,
  open,
  onClose,
}: {
  reportId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const [report, setReport] = useState<AuditEvaluationReportItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reportId || !open) return;
    setLoading(true);
    fetchAuditReportDetail(reportId)
      .then(setReport)
      .catch(() => message.error("加载报告详情失败"))
      .finally(() => setLoading(false));
  }, [reportId, open]);

  const sortedCategories = report?.per_category_metrics
    ? Object.entries(report.per_category_metrics).sort(
        (a, b) => b[1].total - a[1].total
      )
    : [];

  const sortedRiskLevels = report?.per_risk_level_metrics
    ? Object.entries(report.per_risk_level_metrics).sort(
        (a, b) => b[1].total - a[1].total
      )
    : [];

  const matrixLabels = ["SAFE", "RISK_LOW", "RISK_MEDIUM", "RISK_HIGH"];

  return (
    <Modal
      title={`评估报告 #${reportId}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {loading ? (
        <Typography.Text>加载中...</Typography.Text>
      ) : report ? (
        <div>
          <Typography.Title level={5}>总体指标</Typography.Title>
          <Table
            dataSource={[
              {
                key: "overall",
                accuracy: report.accuracy_rate,
                precision: report.precision_rate,
                recall: report.recall_rate,
                f1: report.f1_score,
                total: report.total_samples,
              },
            ]}
            columns={[
              { title: "准确率", dataIndex: "accuracy", render: formatPct },
              { title: "精确率", dataIndex: "precision", render: formatPct },
              { title: "召回率", dataIndex: "recall", render: formatPct },
              { title: "F1", dataIndex: "f1", render: formatPct },
              { title: "样本数", dataIndex: "total" },
            ]}
            pagination={false}
            size="small"
            rowKey="key"
          />

          {sortedCategories.length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 16 }}>
                按风险类别
              </Typography.Title>
              <Table
                dataSource={sortedCategories.map(([cat, m]) => ({
                  category: categoryLabels[cat] || cat,
                  ...m,
                }))}
                columns={[
                  { title: "类别", dataIndex: "category" },
                  { title: "准确率", dataIndex: "accuracy", render: formatPct },
                  { title: "精确率", dataIndex: "precision", render: formatPct },
                  { title: "召回率", dataIndex: "recall", render: formatPct },
                  { title: "F1", dataIndex: "f1", render: formatPct },
                  { title: "样本", dataIndex: "total" },
                ]}
                pagination={false}
                size="small"
                rowKey="category"
              />
            </>
          )}

          {sortedRiskLevels.length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 16 }}>
                按风险等级
              </Typography.Title>
              <Table
                dataSource={sortedRiskLevels.map(([level, m]) => ({
                  level,
                  ...m,
                }))}
                columns={[
                  { title: "等级", dataIndex: "level" },
                  { title: "准确率", dataIndex: "accuracy", render: formatPct },
                  { title: "精确率", dataIndex: "precision", render: formatPct },
                  { title: "召回率", dataIndex: "recall", render: formatPct },
                  { title: "F1", dataIndex: "f1", render: formatPct },
                  { title: "样本", dataIndex: "total" },
                ]}
                pagination={false}
                size="small"
                rowKey="level"
              />
            </>
          )}

          {report.confusion_matrix && (
            <>
              <Typography.Title level={5} style={{ marginTop: 16 }}>
                混淆矩阵（行=真实 / 列=预测）
              </Typography.Title>
              <Table
                dataSource={matrixLabels.map((gtLabel) => ({
                  key: gtLabel,
                  label: gtLabel,
                  ...Object.fromEntries(
                    matrixLabels.map((predLabel) => [
                      predLabel,
                      report.confusion_matrix?.[gtLabel]?.[predLabel] || 0,
                    ])
                  ),
                }))}
                columns={[
                  { title: "", dataIndex: "label", key: "label", width: 100 },
                  ...matrixLabels.map((l) => ({
                    title: l,
                    dataIndex: l,
                    key: l,
                  })),
                ]}
                pagination={false}
                size="small"
                rowKey="key"
              />
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function ReportsTab() {
  const [messageApi, contextHolder] = message.useMessage();
  const [reports, setReports] = useState<AuditEvaluationReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function loadReports() {
    setLoading(true);
    try {
      const data = await fetchAuditReports();
      setReports(data);
    } catch {
      messageApi.error("加载评估报告失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateAuditReport();
      messageApi.success("评估报告已生成");
      loadReports();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "生成报告失败");
    } finally {
      setGenerating(false);
    }
  }

  const columns = [
    { title: "报告 ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: "样本总数",
      dataIndex: "total_samples",
      key: "total_samples",
      width: 100,
    },
    {
      title: "准确率",
      dataIndex: "accuracy_rate",
      key: "accuracy_rate",
      render: formatPct,
    },
    {
      title: "精确率",
      dataIndex: "precision_rate",
      key: "precision_rate",
      render: formatPct,
    },
    {
      title: "召回率",
      dataIndex: "recall_rate",
      key: "recall_rate",
      render: formatPct,
    },
    {
      title: "F1 分数",
      dataIndex: "f1_score",
      key: "f1_score",
      render: formatPct,
    },
    {
      title: "生成时间",
      dataIndex: "report_generated_at",
      key: "report_generated_at",
      width: 160,
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_: unknown, record: AuditEvaluationReportItem) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setDetailId(record.id);
            setDetailOpen(true);
          }}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleGenerate} loading={generating}>
          生成最新评估报告
        </Button>
      </div>
      <Table
        dataSource={reports}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      <ReportDetailModal
        reportId={detailId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

export default function AuditPage() {
  const { currentUser } = useModel("auth");

  if (!currentUser) {
    history.push("/login");
    return null;
  }

  const items: TabsProps["items"] = [
    { key: "annotations", label: "审核标注", children: <AnnotationsTab /> },
    { key: "reports", label: "评估报告", children: <ReportsTab /> },
  ];

  return (
    <div className={styles.profilePage}>
      <Card className={styles.panel}>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>
          内容审核管理
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          对 AI 审核结果进行人工标注验证，可使用种子样本快速填充测试数据，生成含混淆矩阵和多维度拆分的评估报告。
        </Typography.Paragraph>
        <Tabs items={items} />
      </Card>
    </div>
  );
}
