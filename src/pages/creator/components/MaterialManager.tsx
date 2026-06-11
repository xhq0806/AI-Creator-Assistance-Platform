import { useEffect, useState } from "react";
import { Divider, Card, Typography, Space, Button, Upload, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PictureOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { message } from "antd";
import { getUploadCredential, confirmUpload, type MaterialItem } from "@/services/api";
import styles from "../index.less";

type MaterialManagerProps = {
  materials: MaterialItem[];
  mediaUrls: string[];
  setMediaUrls: (v: string[] | ((prev: string[]) => string[])) => void;
  onDeleteMaterial: (item: MaterialItem) => void;
  onRefineImage: (url: string) => void;
};

function isVideoUrl(url: string) {
  return url.startsWith("data:video/") || /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

function isImageUrl(url: string) {
  return (
    url.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url) ||
    (/^https?:\/\//i.test(url) && !isVideoUrl(url))
  );
}

function MediaLoadFallback() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "20px 16px",
        color: "#9ca3af",
        background: "#111827",
      }}
    >
      <PictureOutlined style={{ fontSize: 28, color: "#6b7280" }} />
      <Typography.Text style={{ color: "#9ca3af", fontSize: 13 }}>
        图片无法加载
      </Typography.Text>
      <Typography.Text style={{ color: "#6b7280", fontSize: 11 }}>
        链接可能已过期或文件不存在，可移除后重新生成
      </Typography.Text>
    </div>
  );
}

export default function MaterialManager({
  materials,
  mediaUrls,
  setMediaUrls,
  onDeleteMaterial,
  onRefineImage,
}: MaterialManagerProps) {
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setBrokenUrls(new Set());
  }, [mediaUrls]);

  function markBroken(url: string) {
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }

  const uploadProps: UploadProps = {
    name: "file",
    accept: "image/*,video/*,audio/*",
    customRequest: async (options) => {
      const { file, onSuccess, onError, onProgress } = options;
      try {
        onProgress?.({ percent: 5 });
        const credential = await getUploadCredential({
          file_name: (file as File).name,
          file_type: (file as File).type,
        });

        if (credential.provider === "mock_demo") {
          onProgress?.({ percent: 100 });
          const fileObj = file as File;
          if (fileObj.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const localUrl = e.target?.result as string;
              message.success("演示模式，素材已添加");
              setMediaUrls((prev) => Array.from(new Set([...prev, localUrl])));
              onSuccess?.({ url: localUrl });
            };
            reader.readAsDataURL(fileObj);
          } else {
            message.success("演示模式，素材已添加");
            setMediaUrls((prev) => Array.from(new Set([...prev, credential.access_url])));
            onSuccess?.({ url: credential.access_url });
          }
          return;
        }

        onProgress?.({ percent: 10 });
        const formData = new FormData();
        formData.append("key", credential.oss_key || "");
        formData.append("OSSAccessKeyId", credential.access_id || "");
        formData.append("policy", credential.policy || "");
        formData.append("signature", credential.signature || "");
        formData.append("file", file as File);

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.total > 0) {
            onProgress?.({ percent: Math.round(10 + (event.loaded / event.total) * 85) });
          }
        });
        xhr.addEventListener("load", async () => {
          if (xhr.status === 204 || xhr.status === 200 || xhr.status === 201) {
            onProgress?.({ percent: 98 });
            await confirmUpload({
              material_id: credential.material_id!,
              file_size: (file as File).size,
              mime_type: (file as File).type,
            });
            onProgress?.({ percent: 100 });
            message.success("素材已上传至阿里云 OSS");
            setMediaUrls((prev) => Array.from(new Set([...prev, credential.access_url])));
            onSuccess?.({ url: credential.access_url });
          } else {
            onError?.(new Error("上传到阿里云 OSS 失败"));
          }
        });
        xhr.addEventListener("error", () => {
          onError?.(new Error("上传失败，请检查OSS CORS跨域配置"));
        });
        xhr.open("POST", credential.upload_url);
        xhr.send(formData);
      } catch (err) {
        onError?.(err as Error);
      }
    },
    maxCount: 10,
    multiple: true,
    listType: "picture-card",
  };

  return (
    <Card className={styles.sideCard} title="素材管理与合规校验">
      <Upload {...uploadProps}>
        <div style={{ padding: 16, textAlign: "center" }}>+ 选择本地上传</div>
      </Upload>
      <Divider />
      <Space direction="vertical" size={8}>
        {materials.map((item) => (
          <Space key={item.id} direction="vertical" size={4} style={{ width: "100%" }}>
            {item.media_type === "image" && (
              brokenUrls.has(item.url) ? (
                <MediaLoadFallback />
              ) : (
                <img
                  className={styles.materialPreview}
                  src={item.url}
                  alt={item.name}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", item.url)}
                  onError={() => markBroken(item.url)}
                />
              )
            )}
            <Space.Compact style={{ width: "100%" }}>
              <Button
                block
                title={item.risk_reason}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", item.url)}
                onClick={() =>
                  setMediaUrls((current) => Array.from(new Set([...current, item.url])))
                }
              >
                {item.name}
              </Button>
              <Button icon={<DeleteOutlined />} onClick={() => onDeleteMaterial(item)} />
            </Space.Compact>
          </Space>
        ))}
        {mediaUrls.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
            {mediaUrls.map((url) => {
              const isVideo = isVideoUrl(url);
              const isImage = isImageUrl(url);
              const isBroken = brokenUrls.has(url);
              return (
                <div
                  key={url}
                  style={{
                    position: "relative",
                    width: "100%",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#1f2937",
                  }}
                >
                  {isImage && isBroken ? (
                    <MediaLoadFallback />
                  ) : isImage ? (
                    <img
                      src={url}
                      alt="素材"
                      style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "contain" }}
                      onError={() => markBroken(url)}
                    />
                  ) : isVideo ? (
                    <video src={url} controls style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: "100%", height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                      非图片素材
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 8 }}>
                    {isImage && !isBroken && (
                      <Tooltip title="AI 微调配图">
                        <div
                          style={{
                            background: "rgba(22, 119, 255, 0.85)", borderRadius: "50%",
                            width: 36, height: 36, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "white", fontSize: 16,
                          }}
                          onClick={() => onRefineImage(url)}
                        >
                          <EditOutlined />
                        </div>
                      </Tooltip>
                    )}
                    <div
                      style={{
                        background: "rgba(0,0,0,0.75)", borderRadius: "50%",
                        width: 36, height: 36, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "white", fontSize: 20,
                      }}
                      onClick={() => setMediaUrls((current) => current.filter((u) => u !== url))}
                    >
                      ×
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Space>
    </Card>
  );
}
