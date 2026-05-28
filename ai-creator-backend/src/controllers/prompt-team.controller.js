const { PromptTeam, PromptTeamMember, PromptTemplate, PromptTemplateVersion, User } = require('../models');
const { ok, fail } = require('../utils/apiResponse');

async function createTeam(req, res) {
  try {
    const { name } = req.body;
    const userId = req.user?.id;
    const team = await PromptTeam.create({ name, owner_id: userId });
    await PromptTeamMember.create({ team_id: team.id, user_id: userId, role: 'admin' });
    return ok(res, team);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function listMyTeams(req, res) {
  try {
    const userId = req.user?.id;
    const memberships = await PromptTeamMember.findAll({ where: { user_id: userId } });
    const teamIds = memberships.map(m => m.team_id);
    const teams = await PromptTeam.findAll({ where: { id: teamIds } });
    return ok(res, teams);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function addTeamMember(req, res) {
  try {
    const { team_id, user_id, role } = req.body;
    const currentUserId = req.user?.id;
    const team = await PromptTeam.findByPk(team_id);
    if (!team) return fail(res, '团队不存在');
    if (team.owner_id !== currentUserId) return fail(res, '无权限操作');
    const [member, created] = await PromptTeamMember.findOrCreate({
      where: { team_id, user_id },
      defaults: { role: role || 'viewer' },
    });
    if (!created) {
      await member.update({ role: role || 'viewer' });
    }
    return ok(res, member);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function saveTemplateWithVersion(req, res) {
  try {
    const { id, name, category, content, change_note, visibility, team_id } = req.body;
    const userId = req.user?.id;
    let template;

    if (id) {
      template = await PromptTemplate.findOne({ where: { id, user_id: userId } });
      if (!template) return fail(res, '模板不存在或无权修改');
      const lastVersion = await PromptTemplateVersion.findOne({
        where: { template_id: id },
        order: [['version_no', 'DESC']],
      });
      const nextVersionNo = lastVersion ? lastVersion.version_no + 1 : 1;
      await PromptTemplateVersion.create({
        template_id: id,
        version_no: nextVersionNo,
        name: template.name,
        category: template.category,
        content: template.content,
        change_note,
        created_by: userId,
      });
      await template.update({ name, category, content, visibility, team_id });
    } else {
      template = await PromptTemplate.create({
        user_id: userId,
        name,
        category,
        content,
        visibility: visibility || 'private',
        team_id,
      });
      await PromptTemplateVersion.create({
        template_id: template.id,
        version_no: 1,
        name,
        category,
        content,
        change_note: '首次创建',
        created_by: userId,
      });
    }
    return ok(res, template);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function listTemplateVersions(req, res) {
  try {
    const { template_id } = req.params;
    const userId = req.user?.id;
    const versions = await PromptTemplateVersion.findAll({
      where: { template_id },
      order: [['version_no', 'DESC']],
    });
    return ok(res, versions);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function restoreTemplateVersion(req, res) {
  try {
    const { template_id, version_id } = req.params;
    const userId = req.user?.id;
    const version = await PromptTemplateVersion.findOne({
      where: { id: version_id, template_id },
    });
    if (!version) return fail(res, '版本记录不存在');
    const template = await PromptTemplate.findOne({ where: { id: template_id, user_id: userId } });
    if (!template) return fail(res, '模板不存在或无权修改');
    const lastVersion = await PromptTemplateVersion.findOne({
      where: { template_id },
      order: [['version_no', 'DESC']],
    });
    const nextVersionNo = lastVersion ? lastVersion.version_no + 1 : 1;
    await PromptTemplateVersion.create({
      template_id: template.id,
      version_no: nextVersionNo,
      name: template.name,
      category: template.category,
      content: template.content,
      change_note: `回滚到 v${version.version_no}`,
      created_by: userId,
    });
    await template.update({
      name: version.name,
      category: version.category,
      content: version.content,
    });
    return ok(res, template);
  } catch (error) {
    return fail(res, error.message);
  }
}

module.exports = {
  createTeam,
  listMyTeams,
  addTeamMember,
  saveTemplateWithVersion,
  listTemplateVersions,
  restoreTemplateVersion,
};
