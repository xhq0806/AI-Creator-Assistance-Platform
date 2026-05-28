function ok(res, data) {
  return res.json({ code: 200, data });
}

function fail(res, message) {
  return res.json({ code: 500, message });
}

module.exports = {
  ok,
  fail,
};
