// Request-body validation with Zod.
//
//   router.post('/', requireAuth, validate(createReviewSchema), handler)
//
// On success req.body is REPLACED by the parsed result: unknown keys are
// dropped, strings are trimmed/normalised as the schema says, so handlers only
// ever see clean, correctly-typed data (a number is a number, never `{}` or
// `"1; DROP TABLE"` reaching a SQLite binding and turning into a 500).
//
// On failure: 400 with { error, details }.
//   - `error` is the first problem as a plain string - the same shape every
//     route already returned, so the frontend keeps working unchanged.
//   - `details` lists every problem, for API clients and Swagger.
//
// SQL injection is a separate matter and was already handled: every query in
// this codebase uses `?` placeholders. Validation is about clean errors, sane
// sizes and trusted types.

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const { issues } = result.error;
      return res.status(400).json({
        error: issues[0].message,
        details: issues.map((i) => ({ field: i.path.join('.') || undefined, message: i.message })),
      });
    }
    req.body = result.data;
    next();
  };
}
