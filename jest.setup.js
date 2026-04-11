// Jest global setup — provide required env vars so service modules load without crashing
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.CLERK_SECRET_KEY = 'test_clerk_secret_key';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_google_client_secret';
