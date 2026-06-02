import { Button, Card, Form, Input, Typography, message } from "antd";
import { history, useModel } from "umi";
import { changeMyPassword } from "@/services/api";
import styles from "./index.less";

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function PasswordSettingsPage() {
  const { currentUser, signOut } = useModel("auth");
  const [form] = Form.useForm<PasswordForm>();
  const [messageApi, contextHolder] = message.useMessage();

  if (!currentUser) {
    history.push("/login");
    return null;
  }

  async function handleSubmit(values: PasswordForm) {
    try {
      await changeMyPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      messageApi.success("密码已更新，请重新登录");
      signOut();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "密码修改失败");
    }
  }

  return (
    <div className={styles.profilePage}>
      {contextHolder}
      <Card className={styles.panel}>
        <Typography.Title level={3}>修改密码</Typography.Title>
        <Typography.Paragraph type="secondary">
          修改密码后需要重新登录。新密码需包含大小写字母和数字，至少 8 位。
        </Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: "请输入当前密码" }]}
          >
            <Input.Password placeholder="输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 8, message: "密码至少 8 位" },
              {
                pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: "密码需包含大小写字母和数字",
              },
            ]}
          >
            <Input.Password placeholder="至少 8 位，含大小写字母和数字" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            修改密码
          </Button>
        </Form>
      </Card>
    </div>
  );
}
