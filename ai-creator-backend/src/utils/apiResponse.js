function ok(res, data) {
  return res.json({ code: 200, data });
}

module.exports = {
  ok,
};
