const { getSchema } = require("../validators");

function validate(schemaName, source = "body") {
  return (req, res, next) => {
    const schema = getSchema(schemaName);
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(422).json({
        code: 422,
        message: messages.join("; "),
        errors: error.details.map((d) => ({
          field: d.path.join("."),
          message: d.message,
        })),
      });
    }

    req[source] = value;
    return next();
  };
}

function validateParams(schemaName) {
  return (req, res, next) => {
    const schema = getSchema(schemaName);
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(422).json({
        code: 422,
        message: messages.join("; "),
      });
    }

    req.params = { ...req.params, ...value };
    return next();
  };
}

function validateQuery(schemaName) {
  return (req, res, next) => {
    const schema = getSchema(schemaName);
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(422).json({
        code: 422,
        message: messages.join("; "),
      });
    }

    req.query = value;
    return next();
  };
}

module.exports = { validate, validateParams, validateQuery };
