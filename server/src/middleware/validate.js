// Validates req.body/query/params against a Zod schema.
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => ({
        field: i.path.slice(1).join('.') || i.path[0],
        message: i.message,
      }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    if (parsed.data.body) req.body = parsed.data.body;
    if (parsed.data.query) req.validatedQuery = parsed.data.query;
    next();
  } catch (e) {
    next(e);
  }
};

module.exports = validate;
