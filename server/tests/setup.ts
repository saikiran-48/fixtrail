// Runs before every test file. Sets env vars only; it does not start a database.
// Database-backed tests choose their database in flow.test.ts.
//
// Tests run against a throwaway database, never your development data.
//   TEST_MONGODB_URI=mongodb://localhost:27017/fixtrail_test npm test
// The database name MUST end in "_test", because the tests delete every
// document between cases. If TEST_MONGODB_URI is unset, an in-memory MongoDB
// is started instead.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation-1234';
process.env.DEMO_LOGIN = 'true';
// Placeholder so config parsing passes; the real connection string is passed to connectDb().
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/placeholder';

const given = process.env.TEST_MONGODB_URI;
if (given) {
  const dbName = new URL(given).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against "${dbName}". TEST_MONGODB_URI must point at a database whose name ends in _test.`,
    );
  }
}
