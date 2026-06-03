import { useEffect, useState } from 'react';
import {
  Tabs, Card, Form, Slider, InputNumber, Button, Input, Select, Typography,
  message, Spin, Divider, Tag,
} from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  fetchRankingWeights, updateRankingWeights,
  fetchAdminAIConfig, updateAdminAIConfig,
  fetchAdminRateLimit, updateAdminRateLimit,
} from '@/services/api/admin';

const { Title, Text } = Typography;

export default function AdminSystem() {
  return (
    <div>
      <Title level={4}>系统配置</Title>
      <Card>
        <Tabs
          defaultActiveKey="ranking"
          items={[
            { key: 'ranking', label: '排名权重', children: <RankingWeightsTab /> },
            { key: 'ai', label: 'AI 配置', children: <AIConfigTab /> },
            { key: 'ratelimit', label: '限流配置', children: <RateLimitTab /> },
          ]}
        />
      </Card>
    </div>
  );
}

function RankingWeightsTab() {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [defaults, setDefaults] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchRankingWeights();
      setWeights(res.data.weights);
      setDefaults(res.data.defaults);
    } catch {
      message.error('加载排名权重失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateRankingWeights(weights);
      message.success('排名权重已保存（30 秒内生效）');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  function updateWeight(key: string, value: number | null) {
    setWeights((prev) => ({ ...prev, [key]: value ?? 0 }));
  }

  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

  const labels: Record<string, string> = {
    qualityScore: '质量分权重',
    aiRankScore: 'AI 排名分权重',
    viewLog: '浏览对数权重',
    feedbackLog: '反馈对数权重',
    negative: '负面惩罚权重',
    age: '时间衰减权重',
  };

  const hotScorePreview =
    `score = qualityScore × ${weights.qualityScore?.toFixed(2)} + aiRankScore × ${weights.aiRankScore?.toFixed(2)} + log(views+1) × ${weights.viewLog?.toFixed(2)} + log(feedback+1) × ${weights.feedbackLog?.toFixed(2)} - negatives × ${weights.negative?.toFixed(2)} - ageHours × ${weights.age?.toFixed(2)}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong>调整热榜排名公式权重</Text>
        <Button icon={<ReloadOutlined />} onClick={load} size="small">重置为默认值</Button>
      </div>
      <Form layout="vertical">
        {Object.entries(labels).map(([key, label]) => (
          <Form.Item key={key} label={`${label} (${key})`}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Slider
                style={{ flex: 1 }}
                min={0}
                max={2}
                step={0.01}
                value={weights[key] ?? defaults[key] ?? 0}
                onChange={(v) => updateWeight(key, v as number)}
              />
              <InputNumber
                min={0}
                max={2}
                step={0.01}
                value={weights[key] ?? defaults[key] ?? 0}
                onChange={(v) => updateWeight(key, v)}
                style={{ width: 80 }}
              />
              {defaults[key] !== undefined && (
                <Tag color="default" style={{ minWidth: 50, textAlign: 'center' }}>
                  默认 {defaults[key].toFixed(2)}
                </Tag>
              )}
            </div>
          </Form.Item>
        ))}
      </Form>
      <Divider />
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 16 }}>
        <Text code style={{ fontSize: 12 }}>{hotScorePreview}</Text>
      </div>
      <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
        保存权重配置
      </Button>
    </div>
  );
}

function AIConfigTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminAIConfig();
      form.setFieldsValue(res.data);
    } catch {
      message.error('加载 AI 配置失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const values = await form.validateFields();
      await updateAdminAIConfig(values);
      message.success('AI 配置已保存');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

  return (
    <div>
      <Form form={form} layout="vertical">
        <Form.Item name="provider" label="AI 提供商">
          <Select
            options={[
              { value: 'ark', label: '火山方舟 (Ark)' },
              { value: 'modelscope', label: 'ModelScope' },
            ]}
          />
        </Form.Item>
        <Form.Item name="apiKey" label="API Key">
          <Input.Password placeholder="输入新的 API Key（留空则保持不变）" />
        </Form.Item>
        <Form.Item name="baseURL" label="Base URL">
          <Input placeholder="API Base URL" />
        </Form.Item>
        <Form.Item name="textModel" label="文本模型">
          <Input placeholder="例如: doubao-seed-2-0-lite-260428" />
        </Form.Item>
        <Form.Item name="imageModel" label="图片模型">
          <Input placeholder="图片生成模型（可选）" />
        </Form.Item>
        <Form.Item name="videoModel" label="视频模型">
          <Input placeholder="视频生成模型（可选）" />
        </Form.Item>
      </Form>
      <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
        保存 AI 配置
      </Button>
    </div>
  );
}

function RateLimitTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminRateLimit();
      form.setFieldsValue(res.data.config);
    } catch {
      message.error('加载限流配置失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const values = await form.validateFields();
      await updateAdminRateLimit(values);
      message.success('限流配置已保存');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

  const fields = [
    { name: 'globalWindowMs', label: '全局时间窗口 (ms)', min: 1000, max: 3600000 },
    { name: 'globalMax', label: '全局最大请求数', min: 1, max: 10000 },
    { name: 'aiGenerate', label: 'AI 生成 (/generate)', min: 1, max: 1000 },
    { name: 'aiGenerateImage', label: 'AI 图片生成 (/generate-image)', min: 1, max: 1000 },
    { name: 'aiGenerateVideo', label: 'AI 视频生成 (/generate-video)', min: 1, max: 1000 },
    { name: 'aiAudit', label: 'AI 审核 (/audit)', min: 1, max: 1000 },
    { name: 'aiQuality', label: 'AI 质量评估 (/quality)', min: 1, max: 1000 },
  ];

  return (
    <div>
      <Form form={form} layout="vertical">
        {fields.map((f) => (
          <Form.Item key={f.name} name={f.name} label={f.label}>
            <InputNumber min={f.min} max={f.max} style={{ width: '100%' }} />
          </Form.Item>
        ))}
      </Form>
      <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
        保存限流配置
      </Button>
    </div>
  );
}
