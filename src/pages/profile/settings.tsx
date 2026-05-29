import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { history, useModel } from "umi";
import { fetchMyProfile, updateMyProfile } from "@/services/api";
import styles from "./index.less";

type AccountForm = {
  phone?: string;
  email?: string;
};

export default function AccountSettingsPage() {
  const { currentUser, updateCurrentUser } = useModel("auth");
  const [form] = Form.useForm<AccountForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      history.push("/login");
      return;
    }

    void fetchMyProfile().then((profile) => {
      form.setFieldsValue({
        phone: profile.phone,
        email: profile.email,
      });
    });
  }, [currentUser?.id]);

  async function handleSubmit(values: AccountForm) {
    setLoading(true);
    try {
      const profile = await updateMyProfile(values);
      updateCurrentUser(profile);
      messageApi.success("账号设置已更新");
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
        <Typography.Title level={3}>账号设置</Typography.Title>
        <Typography.Paragraph type="secondary">
          维护手机号和邮箱，用于账号登录和身份识别。
        </Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存设置
          </Button>
        </Form>
      </Card>
    </div>
  );
}
