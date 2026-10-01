// Express 4 does not catch errors thrown inside `async` route handlers: a
// throw (or a rejected await) becomes an unhandled promise rejection, which on
// Node 15+ terminates the whole process. Wrapping an async handler with this
// forwards the error to the global error middleware in server.js instead,
// which answers 500 JSON and keeps the server up.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
