const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
      .catch((err) => next(err));
  };
};

export {asyncHandler};
// This utility function wraps an asynchronous request handler and ensures that any errors thrown within the handler are passed to the next middleware in the Express.js error handling chain.
// It allows for cleaner error handling in Express applications by avoiding the need to explicitly catch errors in every async route handler.
// Usage example:
// app.get('/some-route', asyncHandler(async (req, res) => {
//   const data = await someAsyncOperation();
//   res.json(data);
// }));
// In this example, if `someAsyncOperation` throws an error, it will be caught by the `asyncHandler` and passed to the next error handling middleware, allowing for centralized error handling in your Express application.
// This is particularly useful for keeping your route handlers clean and focused on their primary logic without cluttering them with error handling code.

// const asyncHandler = () => {}
// const asyncHandler = (func) => {() => {}}
// const asyncHandler = (func) => async () => {}


// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }