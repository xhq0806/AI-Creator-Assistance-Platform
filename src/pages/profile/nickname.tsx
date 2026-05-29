import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { history, useModel } from "umi";
import { fetchMyProfile, updateMyProfile } from "@/services/api";
import styles from "./index.less";

type NicknameForm = {
  username: string;
};

export default function NicknameSettingsPage() {
  const { currentUser, updateCurrentUser } = useModel("auth");
  const [form] = Form.useForm<NicknameForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      history.push("/login");
      return;
    }

    void fetchMyProfile().then((profile) => {
      form.setFieldsValue({ username: profile.username });
    });
  }, [currentUser?.id]);

  async function handleSubmit(values: NicknameForm) {
    setLoading(true);
    try {
      const profile = await updateMyProfile({ username: values.username });
      updateCurrentUser(profile);
      messageApi.success("昵称已更新");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.profilePage}>
      {contextHolder}
      <Card className={styles.panel}>
        <Typography.Title level={3}>昵称设置</Typography.Title>
        <Typography.Paragraph type="secondary">
          昵称会展示在导航栏、文章作者和内容详情中。
        </Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            label="昵称"
            rules={[{ required: true, message: "请输入昵称" }]}
          >
            <Input placeholder="请输入昵称" maxLength={50} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存昵称
          </Button>
        </Form>
      </Card>
    </div>
  );
}
