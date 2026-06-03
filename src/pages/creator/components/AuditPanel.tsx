import { Alert, Button, Card, Space, Typography } from "antd";
import type { AuditResult } from "@/services/api";
import styles from "../index.less";

type AuditPanelProps = {
  auditResult?: AuditResult;
  onApplySafeAlternative: () => void;
};

export default function AuditPanel({ auditResult, onApplySafeAlternative }: AuditPanelProps) {
  return (
    <Card className={styles.sideCard} title="安全审核">
      {auditResult ? (
        <Alert
          className={styles.auditResult}
          type={auditResult.is_compliant ? "success" : "warning"}
          message={
            auditResult.is_compliant
              ? "内容合规"
              : `风险等级：${auditResult.risk_level}`
          }
          description={
            <Space direction="vertical">
              <span>{auditResult.reason}</span>
              <span>置信度：{Math.round(auditResult.accuracy * 100)}%</span>
              {auditResult.safe_alternative && (
                <>
                  <span>替代文本：{auditResult.safe_alternative}</span>
                  <Button size="small" onClick={onApplySafeAlternative}>
                    一键应用合规替代内容
                  </Button>
                </>
              )}
            </Space>
          }
          showIcon
        />
      ) : (
        <Typography.Paragraph className={styles.whiteText}>
          点击「安全审核」按钮，自动检测内容是否涉及违规信息，保障发布安全。
        </Typography.Paragraph>
      )}
    </Card>
  );
}
