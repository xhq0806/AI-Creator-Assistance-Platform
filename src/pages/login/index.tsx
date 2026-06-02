import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Tabs, Typography, message } from "antd";
import { useModel } from "umi";
import styles from "./index.less";

type LoginForm = {
  account: string;
  password: string;
};

type RegisterForm = LoginForm & {
  username: string;
  phone?: string;
  email?: string;
};

export default function LoginPage() {
  const { signIn, signUp } = useModel("auth");
  const [messageApi, contextHolder] = message.useMessage();

  async function handleSubmit(values: LoginForm) {
    try {
      await signIn(values.account, values.password);
      messageApi.success("登录成功");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "登录失败");
    }
  }

  async function handleRegister(values: RegisterForm) {
    try {
      await signUp(values);
      messageApi.success("注册成功");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "注册失败");
    }
  }

  return (
    <div className={styles.loginPage}>
      <Card className={styles.loginCard}>
        {contextHolder}
        <Typography.Title level={3}>创作者账户中心</Typography.Title>
        <Tabs
          items={[
            {
              key: "login",
              label: "登录",
              children: (
                <>
                  <Typography.Paragraph type="secondary">
                    支持用户名、手机号或邮箱登录。本地默认账号：admin / admin123
                  </Typography.Paragraph>
                  <Form<LoginForm>
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ account: "admin" }}
                  >
                    <Form.Item
                      name="account"
                      label="账号"
                      rules={[
                        {
                          required: true,
                          message: "请输入用户名、手机号或邮箱",
                        },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="admin / 13800000000 / name@example.com"
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[{ required: true, message: "请输入密码" }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="admin123"
                      />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      登录
                    </Button>
                  </Form>
                </>
              ),
            },
            {
              key: "register",
              label: "注册",
              children: (
                <Form<RegisterForm> layout="vertical" onFinish={handleRegister}>
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: "请输入用户名" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="creator001" />
                  </Form.Item>
                  <Form.Item name="phone" label="手机号">
                    <Input placeholder="13800000000" />
                  </Form.Item>
                  <Form.Item name="email" label="邮箱">
                    <Input placeholder="name@example.com" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[
                      { required: true, message: "请输入密码" },
                      { min: 8, message: "密码至少 8 位" },
                      {
                        pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: "密码需包含大小写字母和数字",
                      },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    注册并登录
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
