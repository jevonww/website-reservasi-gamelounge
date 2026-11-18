import "dotenv/config";

// The session module requires a 32+ character secret in production only.
// Tests always use an explicit secret so behavior matches production signing.
process.env.AUTH_SECRET ??= "test-secret-value-that-is-long-enough-1234567890";
