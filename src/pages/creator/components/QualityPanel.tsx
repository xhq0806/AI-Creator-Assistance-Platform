import { Card, Space, Tag, Typography } from "antd";
import styles from "../index.less";

type QualityResult = {
  quality_score: number;
  structure: number;
  depth: number;
  fluency: number;
  reason: string;
};

type QualityPanelProps = {
  qualityResult?: QualityResult;
};

export default function QualityPanel({ qualityResult }: QualityPanelProps) {
  return (
    <Card className={styles.sideCard} title="质量评估">
      {qualityResult ? (
        <div className={styles.qualitySection}>
          <Space direction="horizontal" size={8} wrap>
            <Tag color="blue">综合 {Math.round(qualityResult.quality_score)}</Tag>
            <Tag>结构 {Math.round(qualityResult.structure)}</Tag>
            <Tag>深度 {Math.round(qualityResult.depth)}</Tag>
            <Tag>流畅 {Math.round(qualityResult.fluency)}</Tag>
          </Space>
          <Typography.Paragraph className={styles.whiteText}>
            {qualityResult.reason}
          </Typography.Paragraph>
        </div>
      ) : (
        <Typography.Paragraph className={styles.whiteText}>
          发布时会自动评分，也可以在编辑过程中手动查看结构、深度、流畅度等子分。
        </Typography.Paragraph>
      )}
    </Card>
  );
}
