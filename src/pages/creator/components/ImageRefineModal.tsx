import { useState } from "react";
import { Modal, Input, Image, Typography, message } from "antd";
import { refineImage } from "@/services/api";

type ImageRefineModalProps = {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onRefined: (newUrl: string) => void;
};

export default function ImageRefineModal({
  open,
  imageUrl,
  onClose,
  onRefined,
}: ImageRefineModalProps) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRefine() {
    if (!instruction.trim()) {
      message.warning("请输入想要微调的内容");
      return;
    }
    setLoading(true);
    try {
      const result = await refineImage({
        image_url: imageUrl,
        instruction: instruction.trim(),
      });
      const newUrl = result.media_urls?.[0];
      if (newUrl) {
        onRefined(newUrl);
        message.success("配图已微调");
        setInstruction("");
        onClose();
      } else {
        message.error("微调未返回有效图片");
      }
    } catch (error: any) {
      message.error(error instanceof Error ? error.message : "图片微调失败");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setInstruction("");
    onClose();
  }

  return (
    <Modal
      title="配图 AI 微调"
      open={open}
      onCancel={handleCancel}
      onOk={handleRefine}
      confirmLoading={loading}
      okText="开始微调"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <Image
          src={imageUrl}
          alt="待微调配图"
          style={{ maxHeight: 260, borderRadius: 10, objectFit: "contain" }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        />
      </div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        AI 会在原图基础上只修改你指定的部分，构图、人物姿态、场景布局保持不变。
        请用简短指令描述希望调整的细节。
      </Typography.Paragraph>
      <Input.TextArea
        rows={3}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="例如：把上衣颜色改成黑色 / 背景换成海边日落 / 让光线更柔和温暖"
        maxLength={2000}
        showCount
      />
    </Modal>
  );
}
