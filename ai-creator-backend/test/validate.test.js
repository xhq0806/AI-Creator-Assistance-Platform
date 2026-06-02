const test = require("node:test");
const assert = require("node:assert/strict");
const { getSchema } = require("../src/validators");

test("getSchema returns a Joi schema for known names", () => {
  const schema = getSchema("login");
  assert.ok(schema);
  assert.equal(typeof schema.validate, "function");
});

test("getSchema throws for unknown schema name", () => {
  assert.throws(() => getSchema("nonexistent"), {
    message: /Unknown validation schema/,
  });
});

test("login schema validates correct input", () => {
  const schema = getSchema("login");
  const { error, value } = schema.validate({
    account: "testuser",
    password: "123456",
  });
  assert.equal(error, undefined);
  assert.equal(value.account, "testuser");
  assert.equal(value.password, "123456");
});

test("login schema rejects missing fields", () => {
  const schema = getSchema("login");
  const { error } = schema.validate({ account: "testuser" });
  assert.ok(error);
});

test("register schema enforces password minimum length", () => {
  const schema = getSchema("register");
  const { error } = schema.validate({
    username: "test",
    password: "short12",
  });
  assert.ok(error);
});

test("register schema accepts valid phone", () => {
  const schema = getSchema("register");
  const { error, value } = schema.validate({
    username: "test",
    password: "Test1234",
    phone: "13800138000",
  });
  assert.equal(error, undefined);
  assert.equal(value.phone, "13800138000");
});

test("register schema rejects invalid phone format", () => {
  const schema = getSchema("register");
  const { error } = schema.validate({
    username: "test",
    password: "Test1234",
    phone: "12345",
  });
  assert.ok(error);
});

test("aiGenerate schema validates full generation mode", () => {
  const schema = getSchema("aiGenerate");
  const { error, value } = schema.validate({
    prompt: "写一篇关于AI的文章",
    mode: "full_generation",
    materials: [],
  });
  assert.equal(error, undefined);
  assert.equal(value.mode, "full_generation");
});

test("aiGenerate schema rejects invalid mode value", () => {
  const schema = getSchema("aiGenerate");
  const { error } = schema.validate({
    prompt: "test",
    mode: "invalid_mode",
  });
  assert.ok(error);
});

test("changePassword schema validates password strength", () => {
  const schema = getSchema("changePassword");
  const { error } = schema.validate({
    oldPassword: "123456",
    newPassword: "weak",
  });
  assert.ok(error);
});

test("changePassword schema accepts strong password", () => {
  const schema = getSchema("changePassword");
  const { error, value } = schema.validate({
    oldPassword: "oldpass123",
    newPassword: "NewPass123",
  });
  assert.equal(error, undefined);
  assert.equal(value.newPassword, "NewPass123");
});

test("upsertDraft schema defaults status to draft", () => {
  const schema = getSchema("upsertDraft");
  const { error, value } = schema.validate({
    title: "测试文章",
    content: "正文内容",
  });
  assert.equal(error, undefined);
  assert.equal(value.status, "draft");
  assert.deepEqual(value.media_urls, []);
});

test("articleFeedback schema validates allowed types", () => {
  const schema = getSchema("articleFeedback");
  const { error: err1 } = schema.validate({ type: "like" });
  const { error: err2 } = schema.validate({ type: "favorite" });
  const { error: err3 } = schema.validate({ type: "negative" });
  const { error: err4 } = schema.validate({ type: "invalid" });
  assert.equal(err1, undefined);
  assert.equal(err2, undefined);
  assert.equal(err3, undefined);
  assert.ok(err4);
});

test("createAuditAnnotation schema validates risk levels", () => {
  const schema = getSchema("createAuditAnnotation");
  const { error } = schema.validate({
    title: "测试",
    content: "内容",
    ai_prediction_risk: "SAFE",
    ground_truth_risk: "RISK_HIGH",
  });
  assert.equal(error, undefined);
});

test("distributionSync schema validates platforms", () => {
  const schema = getSchema("distributionSync");
  const { error: err1 } = schema.validate({
    article_id: 1,
    platforms: ["toutiao", "douyin"],
  });
  const { error: err2 } = schema.validate({
    article_id: 1,
    platforms: ["weibo"],
  });
  assert.equal(err1, undefined);
  assert.ok(err2);
});

test("createPromptTeam schema validates team name", () => {
  const schema = getSchema("createTeam");
  const { error: err1 } = schema.validate({ name: "创作团队" });
  const { error: err2 } = schema.validate({ name: "" });
  assert.equal(err1, undefined);
  assert.ok(err2);
});
