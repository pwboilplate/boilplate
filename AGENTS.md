# AI Agent Instructions — Playwright Framework Template

This document provides AI agents with the context needed to create, modify, and maintain tests in this Playwright framework template.

## Project Overview

A reusable Playwright test framework with an extensible fixture architecture for API, integration, browser, and mobile testing. Tests are organized into Playwright projects, each with its own configuration and fixture set.

## Tech Stack

- **Runtime:** Node.js 18+
- **Test Framework:** Playwright Test (`@playwright/test ^1.52.0`)
- **Language:** TypeScript 5.6+
- **Mobile Testing:** Mobilewright (`mobilewright ^0.0.35`)
- **API Testing:** OpenAPI Client Axios (`openapi-client-axios ^7.5.5`)
- **Database:** PostgreSQL (`pg`), MySQL (`mysql2`), MSSQL (`mssql`), SQLite (`better-sqlite3`)
- **Messaging:** KafkaJS (`kafkajs ^2.2.4`)
- **Cache:** ioredis (`ioredis ^5.4.1`)
- **MongoDB:** mongodb (`mongodb ^6.x`)
- **GraphQL:** graphql-request (`graphql-request ^6.x`)
- **OTP/2FA:** otplib (`otplib ^13.4.0`)
- **Property Testing:** fast-check (`fast-check ^3.22.0`)
- **Env Loading:** dotenv (`dotenv ^16.4.5`)

## Project Structure

```
src/
├── index.ts                    # Main exports (test, expect, types, errors)
├── errors.ts                   # Error hierarchy (FrameworkError, FixtureInitError, etc.)
├── config/
│   ├── index.ts                # Config module exports
│   ├── loader.ts               # ConfigLoader — three-tier config resolution
│   ├── env-loader.ts           # EnvLoader — .env file loading
│   └── schema.ts               # TypeScript interfaces for all configs
├── fixtures/
│   ├── index.ts                # Fixture registry — composes all fixtures via test.extend()
│   ├── openapi.fixture.ts      # OpenAPI client fixture
│   ├── database.fixture.ts     # Database client fixture (pg/mysql/sqlite)
│   ├── graphql.fixture.ts      # GraphQL client fixture (queries, mutations, rawRequest)
│   ├── kafka.fixture.ts        # Kafka producer/consumer fixture
│   ├── mongodb.fixture.ts      # MongoDB client fixture (CRUD + aggregation)
│   ├── redis.fixture.ts        # Redis client fixture
│   ├── otp.fixture.ts          # OTP (TOTP/HOTP) fixture for 2FA/MFA testing
│   └── mobilewright.fixture.ts # Mobile testing fixture
├── secrets/
│   ├── index.ts                # Secrets module exports
│   ├── provider.interface.ts   # SecretsProvider interface
│   ├── secrets-manager.ts      # SecretsManager orchestrator
│   └── providers/              # Provider implementations (aws, vault, gitlab, azure, env-file)
└── cli/                        # CLI tool for scaffolding

tests/
├── examples/                   # Reference test files for each fixture
│   ├── openapi.spec.ts
│   ├── database.spec.ts
│   ├── graphql.spec.ts
│   ├── kafka.spec.ts
│   ├── mongodb.spec.ts
│   ├── redis.spec.ts
│   ├── otp.spec.ts
│   └── mobilewright.spec.ts
├── integration/                # Integration/E2E tests
└── properties/                 # Property-based tests (*.prop.ts)
```

## How to Write Tests

### Import Pattern

Always import `test` and `expect` from the framework's main entry point:

```typescript
import { test, expect } from '../../src';
// OR from the fixtures module directly:
import { test, expect } from '../../src/fixtures';
```

**Never** import directly from `@playwright/test` in test files — the framework's `test` object has all fixtures pre-registered.

### Test File Naming

| Project | Pattern | Location |
|---------|---------|----------|
| OpenAPI | `*.spec.ts` | `tests/examples/` or custom dir |
| GraphQL | `*.spec.ts` | `tests/examples/` or custom dir |
| Database | `*.spec.ts` | `tests/examples/` or custom dir |
| MongoDB | `*.spec.ts` | `tests/examples/` or custom dir |
| Kafka | `*.spec.ts` | `tests/examples/` or custom dir |
| Redis | `*.spec.ts` | `tests/examples/` or custom dir |
| Mobile | `*.spec.ts` | `tests/examples/` or custom dir |
| Browser | `*.spec.ts` | `tests/examples/` or custom dir |
| Property | `*.prop.ts` | `tests/properties/` |

### Available Fixtures

Request fixtures by name in the test function signature:

| Fixture Name | Type | Description |
|---|---|---|
| `openApiClient` | `OpenApiClient` | Typed HTTP client from OpenAPI spec (`{ client, api }`) |
| `graphqlClient` | `GraphQLClient` | GraphQL client with `query`, `mutate`, `rawRequest`, `setAuthToken` |
| `databaseClient` | `DatabaseClient` | DB client with `query<T>(sql, params?)` and `execute(sql, params?)` |
| `mongoDbClient` | `MongoDbClient` | MongoDB with `find`, `findOne`, `insertOne`, `insertMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `aggregate` |
| `kafkaClient` | `KafkaClient` | Kafka with `produce(topic, messages)` and `consume(topic, options?)` |
| `redisClient` | `RedisClient` | Redis with `get`, `set`, `del`, `publish`, `subscribe` |
| `otpClient` | `OtpClient` | OTP with `generateTotp`, `verifyTotp`, `generateHotp`, `verifyHotp`, `generateSecret`, `generateKeyUri` |
| `mobilewrightDevice` | `MobilewrightDevice` | Device control (`openUrl`) |
| `mobilewrightScreen` | `MobilewrightScreen` | Screen interactions (`tap`, `fill`, `swipe`, `getByText`, etc.) |

### Test Structure Pattern

```typescript
import { test, expect } from '../../src';

test.describe('Feature Name', () => {
    test('descriptive test name', async ({ fixtureName }) => {
        // Arrange — set up test data
        // Act — perform the operation
        // Assert — verify the result with expect()
    });
});
```

### Fixture API Quick Reference

**OpenAPI Client:**
```typescript
const { client, api } = openApiClient;
const response = await (client as any).operationId(pathParams, body);
expect(response.status).toBe(200);
```

**Database Client:**
```typescript
// SELECT — returns typed rows
const rows = await databaseClient.query<{ id: number; name: string }>(
    'SELECT id, name FROM users WHERE active = $1', [true]
);
// INSERT/UPDATE/DELETE — returns { affectedRows: number }
const result = await databaseClient.execute(
    'INSERT INTO users (name) VALUES ($1)', ['Alice']
);
```

**Kafka Client:**
```typescript
await kafkaClient.produce('topic', [{ key: 'k', value: JSON.stringify(data) }]);
const messages = await kafkaClient.consume('topic', { count: 1, timeout: 10000, fromBeginning: true });
```

**Redis Client:**
```typescript
await redisClient.set('key', 'value', 60); // TTL in seconds (optional)
const val = await redisClient.get('key');   // returns string | null
await redisClient.del('key');               // returns number of keys removed
await redisClient.publish('channel', 'msg');
const msg = await redisClient.subscribe('channel', { timeout: 5000 });
```

**Mobilewright:**
```typescript
await mobilewrightDevice.openUrl('myapp://screen');
const el = mobilewrightScreen.getByText('Button');
await mobilewrightScreen.tap(el);
await mobilewrightScreen.fill(mobilewrightScreen.getByLabel('Email'), 'a@b.com');
await mobilewrightScreen.swipe('down');
```

**MongoDB Client:**
```typescript
// Find documents with options (limit, skip, sort, projection)
const users = await mongoDbClient.find<{ name: string }>('users', { active: true }, { limit: 10, sort: { name: 1 } });

// Find a single document (returns T | null)
const user = await mongoDbClient.findOne<{ name: string }>('users', { email: 'a@b.com' });

// Insert one — returns { insertedId, acknowledged }
const result = await mongoDbClient.insertOne('users', { name: 'Alice', active: true });

// Insert many — returns { insertedIds, insertedCount, acknowledged }
await mongoDbClient.insertMany('users', [{ name: 'A' }, { name: 'B' }]);

// Update — returns { matchedCount, modifiedCount, upsertedId, acknowledged }
await mongoDbClient.updateOne('users', { name: 'Alice' }, { $set: { active: false } });
await mongoDbClient.updateMany('users', { active: false }, { $set: { archived: true } });

// Delete — returns { deletedCount, acknowledged }
await mongoDbClient.deleteOne('users', { name: 'Alice' });
await mongoDbClient.deleteMany('users', { archived: true });

// Aggregation pipeline
const stats = await mongoDbClient.aggregate<{ _id: boolean; count: number }>(
    'users', [{ $group: { _id: '$active', count: { $sum: 1 } } }]
);
```

**GraphQL Client:**
```typescript
// Query — returns typed data directly
const data = await graphqlClient.query<{ users: Array<{ id: string; name: string }> }>(`
    query { users { id name } }
`);

// Query with variables
const user = await graphqlClient.query<{ user: { id: string } }>(
    `query GetUser($id: ID!) { user(id: $id) { id name } }`,
    { id: '123' }
);

// Mutation
const created = await graphqlClient.mutate<{ createUser: { id: string } }>(
    `mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id } }`,
    { input: { name: 'Alice', email: 'alice@example.com' } }
);

// Raw request — returns { data, errors } (useful for testing error scenarios)
const response = await graphqlClient.rawRequest<{ user: null }>(`{ user(id: "bad") { id } }`);
expect(response.errors).toBeDefined();

// Dynamic auth and headers
graphqlClient.setAuthToken('bearer-token');
graphqlClient.setHeader('X-Custom', 'value');
await graphqlClient.query(`{ me { email } }`, undefined, { headers: { 'X-Request-ID': '123' } });
```

**OTP Client:**
```typescript
// Generate a new base32 secret
const secret = otpClient.generateSecret();

// TOTP — time-based one-time password
const token = await otpClient.generateTotp(secret);
const isValid = await otpClient.verifyTotp(token, secret);

// HOTP — counter-based one-time password
const hotpToken = await otpClient.generateHotp(0, secret);  // counter = 0
const hotpValid = await otpClient.verifyHotp(hotpToken, 0, secret);

// Generate otpauth:// URI for QR code provisioning
const uri = otpClient.generateKeyUri('user@example.com', 'MyApp', secret);
```

## Configuration System

### Three-Tier Precedence (highest → lowest)

1. **Project `use` block** in `playwright.config.ts`
2. **Environment variables** (`PW_*` prefix)
3. **`.env.{environment}` file**
4. **`environments.json`** file

Set active environment: `PW_ENVIRONMENT=dev`

### Key Environment Variables

| Variable | Purpose |
|---|---|
| `PW_ENVIRONMENT` | Active environment (`local`, `dev`, `test`, `stg`, `prod`) |
| `PW_OPENAPI_SPEC_PATH` | OpenAPI spec path/URL |
| `PW_OPENAPI_BASE_URL` | API base URL |
| `PW_DB_TYPE` | `postgresql`, `mysql`, `mssql`, `sqlite` |
| `PW_DB_HOST`, `PW_DB_PORT`, `PW_DB_NAME` | Database connection |
| `PW_DB_USERNAME`, `PW_DB_PASSWORD` | Database credentials |
| `PW_KAFKA_BROKERS` | Comma-separated broker list |
| `PW_REDIS_HOST`, `PW_REDIS_PORT`, `PW_REDIS_PASSWORD` | Redis connection |
| `PW_REDIS_KEY_PREFIX` | Test key prefix for isolation |
| `PW_MONGODB_URI` | Full MongoDB connection URI (overrides host/port) |
| `PW_MONGODB_HOST`, `PW_MONGODB_PORT`, `PW_MONGODB_DATABASE` | MongoDB connection |
| `PW_MONGODB_USERNAME`, `PW_MONGODB_PASSWORD` | MongoDB credentials |
| `PW_GRAPHQL_ENDPOINT` | GraphQL endpoint URL |
| `PW_GRAPHQL_AUTH_TOKEN` | Bearer token for GraphQL authorization |
| `PW_MOBILE_PLATFORM` | `ios` or `android` |
| `PW_MOBILE_BUNDLE_ID`, `PW_MOBILE_DEVICE_NAME`, `PW_MOBILE_APP_PATH` | Mobile config |
| `PW_OTP_SECRET` | Base32-encoded OTP secret |
| `PW_OTP_DIGITS` | Token length (default: 6) |
| `PW_OTP_PERIOD` | TOTP time step in seconds (default: 30) |
| `PW_OTP_ALGORITHM` | Hash algorithm: `sha1`, `sha256`, `sha512` |
| `PW_OTP_ISSUER` | Issuer name for URI generation |

## Playwright Projects

Tests are matched to projects via `testMatch` patterns in `playwright.config.ts`:

| Project | testMatch | Fixtures Available |
|---|---|---|
| `openapi` | `**/examples/openapi.spec.ts` | `openApiClient` |
| `mobile-ios` | `**/examples/mobilewright.spec.ts` | `mobilewrightDevice`, `mobilewrightScreen` |
| `mobile-android` | `**/examples/mobilewright.spec.ts` | `mobilewrightDevice`, `mobilewrightScreen` |
| `browser-chromium` | `**/examples/browser.spec.ts` | Standard Playwright `page` |
| `browser-firefox` | `**/examples/browser.spec.ts` | Standard Playwright `page` |
| `browser-webkit` | `**/examples/browser.spec.ts` | Standard Playwright `page` |
| `api-integration` | `**/examples/{database,kafka,redis,mongodb}.spec.ts` | `databaseClient`, `kafkaClient`, `redisClient`, `mongoDbClient` |
| `integration-database` | `**/examples/database.spec.ts` | `databaseClient` |
| `integration-kafka` | `**/examples/kafka.spec.ts` | `kafkaClient` |
| `integration-redis` | `**/examples/redis.spec.ts` | `redisClient` |
| `integration-mongodb` | `**/examples/mongodb.spec.ts` | `mongoDbClient` |
| `property-tests` | `**/*.prop.ts` | None (uses fast-check) |

## Error Handling

Use framework error classes for consistent diagnostics:

```typescript
import { FixtureInitError, FixtureOperationError } from '../../src';

// Setup/connection failures
throw new FixtureInitError('myFixture', 'connect', { host, port, reason: 'Connection refused' });

// Runtime operation failures
throw new FixtureOperationError('myFixture', 'query', { operation: 'fetchData', reason: error.message });
```

Error hierarchy: `FrameworkError` → `ConfigurationError`, `FixtureInitError`, `FixtureOperationError`, `SecretsError`, `DependencyError`.

## Running Tests

```bash
npm test                                          # All tests
npx playwright test --project=openapi             # Single project
npx playwright test --project=api-integration     # Integration tests
npx playwright test --project=property-tests      # Property tests
npm run test:tag -- @smoke                        # By tag
PW_ENVIRONMENT=dev npx playwright test            # Specific environment
npm run typecheck                                 # Type checking only
```

## Creating Custom Fixtures

1. Create `src/fixtures/my-custom.fixture.ts` with setup/use/teardown pattern
2. Register in `src/fixtures/index.ts` by importing and spreading
3. Use in tests by requesting the fixture name as a parameter

Pattern:
```typescript
export const myFixture = {
    myClient: async ({}, use: (client: MyClient) => Promise<void>) => {
        const client = await MyClient.connect(config);  // Setup
        await use(client);                               // Provide to test
        await client.disconnect();                       // Teardown
    },
};
```

## Conventions

- Use `test.describe()` to group related tests
- Use `test.skip()` at describe level for tests requiring unavailable infrastructure
- Use parameterized queries (never string interpolation) for SQL
- Prefer `expect()` assertions from Playwright's built-in expect
- Keep test files focused on a single fixture or feature
- Use JSDoc comments with `@requirements` tags when applicable
- Property tests use `fast-check` and follow `*.prop.ts` naming
