import { Card, Image, Modal, Typography } from "antd";
import type { FormInstance } from "antd";
import RichText from "@/components/RichText";

type PreviewModalProps = {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  mediaUrls: string[];
};

function isImageUrl(url: string) {
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url) || url.startsWith("data:image/");
}

export default function PreviewModal({ open, onClose, form, mediaUrls }: PreviewModalProps) {
  const coverUrl = mediaUrls.find(isImageUrl);
  const title = form.getFieldValue("title") || "(无标题)";

  return (
    <Modal
      title="内容预览"
      open={open}
      onCancel={onClose}
      footer={null}
      width={580}
    >
      <Card
        style={{
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        {/* 封面头图：有配图时展示图片，否则用渐变色 + 首字 */}
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt="封面配图"
            height={180}
            width="100%"
            style={{ objectFit: "cover", display: "block" }}
            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTgwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTgwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjYmZiZmJmIiBmb250LXNpemU9IjE0Ij7nvJPlm77kuI3lj6/nlKg8L3RleHQ+PC9zdmc+"
          />
        ) : (
          <div
            style={{
              height: 180,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            {title.charAt(0) || "?"}
          </div>
        )}
        <div style={{ padding: "16px 20px" }}>
          <Typography.Title level={4} style={{ marginBottom: 8 }}>
            {title}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
            发布者: 当前用户 · 2026-05-31 · 0 阅读
          </Typography.Paragraph>
          <div style={{ maxHeight: 300, overflow: "auto", color: "#374151", fontSize: 14, lineHeight: 1.7 }}>
            <RichText content={form.getFieldValue("content") || "暂无内容"} />
          </div>
          <div
            style={{
              display: "flex", gap: 16, marginTop: 16, paddingTop: 12,
              borderTop: "1px solid #f0f0f0", color: "#94a3b8", fontSize: 13,
            }}
          >
            <span>❤ 0</span>
            <span>⭐ 0</span>
            <span>👎 0</span>
            <span>💬 0</span>
          </div>
        </div>
      </Card>
    </Modal>
  );
}
