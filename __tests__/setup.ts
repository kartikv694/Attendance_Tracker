// Runs before every test file. `src/lib/auth.ts` reads `process.env.JWT_SECRET`
// at module load time (not inside a function), so it must already be set
// before that module is ever imported anywhere in the test run.
process.env.JWT_SECRET ||= "test-only-secret-do-not-use-in-production";
process.env.JWT_EXPIRES_IN ||= "7d";
process.env.QR_EXPIRY_SECONDS ||= "60";
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3000";
