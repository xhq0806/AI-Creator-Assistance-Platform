import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, Empty, Typography } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { fetchDashboardOverview, fetchDashboardTrends } from '@/services/api/admin';
import type { DashboardOverview, TrendData } from '@/services/api/admin';

const { Title } = Typography;

export default function AdminDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ovRes, trRes] = await Promise.all([
          fetchDashboardOverview(),
          fetchDashboardTrends(30),
        ]);
        setOverview(ovRes.data);
        setTrends(trRes.data);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  }

  if (!overview) {
    return <Empty description="无法加载仪表盘数据" />;
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>平台概览</Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={overview.totalUsers}
              prefix={<TeamOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: '#999' }}>
                  活跃 {overview.activeUsers}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="文章总数"
              value={overview.totalArticles}
              prefix={<FileTextOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: '#52c41a' }}>
                  已发布 {overview.publishedArticles}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="今日生成"
              value={overview.generationsToday}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="待审核"
              value={overview.pendingReview}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: overview.pendingReview > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="已驳回"
              value={overview.rejectedArticles}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="已禁用用户"
              value={overview.disabledUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: overview.disabledUsers > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Title level={4} style={{ marginTop: 32, marginBottom: 24 }}>30 日趋势</Title>
      <Card>
        {trends?.series?.length ? (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 600 }}>
              {/* Simple bar chart using CSS — avoids chart library dependency */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 200, padding: '0 8px' }}>
                {trends.series.map((point) => {
                  const maxVal = Math.max(...trends.series.map((p) => p.articles), 1);
                  const height = Math.max(4, (point.articles / maxVal) * 180);
                  return (
                    <div
                      key={point.date}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 8,
                      }}
                      title={`${point.date}: ${point.articles} 文章, ${point.users} 用户`}
                    >
                      <span style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>
                        {point.articles || ''}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height,
                          background: 'linear-gradient(180deg, #1677ff 0%, #69b1ff 100%)',
                          borderRadius: '2px 2px 0 0',
                          minHeight: 4,
                        }}
                      />
                      <span style={{ fontSize: 9, color: '#999', marginTop: 4, transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
                        {point.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 8px' }}>
                <span style={{ fontSize: 12, color: '#999' }}>文章创建趋势</span>
                <span style={{ fontSize: 12, color: '#999' }}>过去 30 天</span>
              </div>
            </div>
          </div>
        ) : (
          <Empty description="暂无趋势数据" />
        )}
      </Card>
    </div>
  );
}
