const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require("uuid");
const { Material } = require("../models");
const { ok, fail } = require("../utils/apiResponse");
const { cloud } = require("../config/env");

function generateMockUploadCredential(fileName) {
  const fileKey =
    "materials/" + Date.now() + "-" + uuidv4() + "-" + fileName;
  return {
    upload_url: "/api/v1/upload/mock-file",
    access_url: "",
    file_key: fileKey,
    provider: "mock_demo",
    expired_at: Date.now() + 15 * 60 * 1000,
  };
}

function generateAliOssCredential(fileName, userId) {
  const fileKey =
    "user-" +
    userId +
    "/materials/" +
    Date.now() +
    "-" +
    uuidv4() +
    "-" +
    fileName;
  const expire = 15 * 60;
  const policyText = {
    expiration: new Date(Date.now() + expire * 1000).toISOString(),
    conditions: [["content-length-range", 0, 104857600]],
  };
  const policy = Buffer.from(JSON.stringify(policyText)).toString("base64");
  const signature = crypto
    .createHmac("sha1", cloud.ossAccessKeySecret)
    .update(policy)
    .digest("base64");

  const accessUrl =
    "https://" +
    cloud.ossBucket +
    "." +
    cloud.ossRegion +
    ".aliyuncs.com/" +
    fileKey;

  return {
    upload_url:
      "https://" + cloud.ossBucket + "." + cloud.ossRegion + ".aliyuncs.com",
    access_url: accessUrl,
    file_key: fileKey,
    provider: "aliyun_oss",
    expired_at: Date.now() + expire * 1000,
    policy: policy,
    signature: signature,
    access_id: cloud.ossAccessKeyId,
    oss_key: fileKey,
  };
}

async function getUploadCredential(req, res) {
  try {
    const { file_name, file_type } = req.body;
    const userId = req.user ? req.user.id : undefined;
    if (!file_name) {
      return fail(res, "文件名不能为空");
    }

    let credential;
    let mediaType;
    if (cloud.provider === "aliyun" && cloud.ossAccessKeyId) {
      credential = generateAliOssCredential(file_name, userId);
      mediaType =
        file_type && file_type.startsWith("video")
          ? "video"
          : file_type && file_type.startsWith("audio")
          ? "audio"
          : "image";
      const material = await Material.create({
        user_id: userId,
        name: file_name,
        url: credential.access_url,
        file_key: credential.file_key,
        mime_type: file_type || "image/jpeg",
        media_type: mediaType,
        upload_status: "uploading",
      });
      return ok(
        res,
        Object.assign({}, credential, { material_id: material.id })
      );
    }

    credential = generateMockUploadCredential(file_name);
    mediaType =
      file_type && file_type.startsWith("video")
        ? "video"
        : file_type && file_type.startsWith("audio")
        ? "audio"
        : "image";
    const material = await Material.create({
      user_id: userId,
      name: file_name,
      url: "",
      file_key: credential.file_key,
      mime_type: file_type || "image/jpeg",
      media_type: mediaType,
      upload_status: "uploading",
    });
    return ok(res, Object.assign({}, credential, { material_id: material.id }));
  } catch (error) {
    console.error("[getUploadCredential error]", error);
    return fail(res, error.message);
  }
}

async function confirmUpload(req, res) {
  try {
    const { material_id, file_size, mime_type } = req.body;
    const userId = req.user ? req.user.id : undefined;
    const material = await Material.findOne({
      where: { id: material_id, user_id: userId },
    });
    if (!material) {
      return fail(res, "素材不存在或无权访问");
    }
    await material.update({
      upload_status: "done",
      file_size: file_size || null,
      mime_type: mime_type || null,
    });
    return ok(res, material);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function uploadMockFile(req, res) {
  try {
    const { material_id, file_name } = req.query;
    const userId = req.user?.id;
    if (!material_id || !file_name) {
      return fail(res, "缺少 material_id 或 file_name");
    }

    const material = await Material.findOne({
      where: { id: Number(material_id), user_id: userId },
    });
    if (!material) {
      return fail(res, "素材不存在或无权访问");
    }

    // Save the raw file body to uploads directory
    const safeName = Date.now() + "-" + file_name.replace(/[^a-zA-Z0-9._一-鿿-]/g, "_");
    const uploadsDir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, req.body);

    const url = "/uploads/" + safeName;
    await material.update({
      url,
      upload_status: "done",
      file_size: req.body.length || null,
    });

    return ok(res, { id: material.id, url, name: file_name });
  } catch (error) {
    console.error("[uploadMockFile error]", error);
    return fail(res, error.message);
  }
}

module.exports = {
  getUploadCredential,
  confirmUpload,
  uploadMockFile,
};