#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Directory structure to scaffold
// ─────────────────────────────────────────────────────────────────────────────

const DIRECTORIES = [
    'tests/specs',
    'tests/pages',
    'tests/utils',
    'tests/fixtures',
    'tests/data',
    'tests/models',
    'tests/config',
];

// ─────────────────────────────────────────────────────────────────────────────
// File templates
// ─────────────────────────────────────────────────────────────────────────────

const FILES: Record<string, string> = {
    '.gitignore': `node_modules/
dist/
playwright-report/
test-results/
blob-report/
*.tgz
.env
.env.*
!.env.example
!.env.*.example
`,

    'playwright.config.ts': `import { defineConfig, devices } from '@playwright/test';
import { ConfigLoader } from './src/config/loader';
import type { ConfigOptions } from './src/fixtures';

const config = new ConfigLoader().load();

export default defineConfig<ConfigOptions>({
    testDir: './tests',
    timeout: 30_000,
    retries: 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'specs',
            testMatch: '**/specs/**/*.spec.ts',
            use: {
                openapi: config.openapi,
                database: config.database,
                kafka: config.kafka,
                redis: config.redis,
            },
        },
        {
            name: 'browser-chromium',
            testMatch: '**/specs/**/*.browser.ts',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: config.openapi?.baseUrl,
            },
        },
        {
            name: 'browser-firefox',
            testMatch: '**/specs/**/*.browser.ts',
            use: {
                ...devices['Desktop Firefox'],
                baseURL: config.openapi?.baseUrl,
            },
        },
        {
            name: 'browser-webkit',
            testMatch: '**/specs/**/*.browser.ts',
            use: {
                ...devices['Desktop Safari'],
                baseURL: config.openapi?.baseUrl,
            },
        },
        {
            name: 'mobile-ios',
            testMatch: '**/specs/**/*.mobile.ts',
            use: {
                mobilewright: config.mobilewright ?? {
                    platform: 'ios',
                    bundleId: '',
                    deviceName: 'iPhone 15',
                    appPath: '',
                },
            },
        },
        {
            name: 'mobile-android',
            testMatch: '**/specs/**/*.mobile.ts',
            use: {
                mobilewright: {
                    platform: 'android',
                    bundleId: config.mobilewright?.bundleId ?? '',
                    deviceName: 'Pixel 8',
                    appPath: config.mobilewright?.appPath ?? '',
                },
            },
        },
    ],
});
`,

    'environments.json': `{
    "environments": {
        "local": {
            "openapi": {
                "specPath": "./specs/api.yaml",
                "baseUrl": "http://localhost:3000"
            },
            "database": {
                "type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "database": "testdb",
                "username": "test",
                "password": "test"
            },
            "kafka": {
                "brokers": ["localhost:9092"]
            },
            "redis": {
                "host": "localhost",
                "port": 6379
            }
        },
        "dev": {
            "openapi": {
                "specPath": "https://api.dev.example.com/openapi.json",
                "baseUrl": "https://api.dev.example.com"
            },
            "database": {
                "type": "postgresql",
                "host": "dev-db.example.com",
                "port": 5432,
                "database": "testdb",
                "username": "dev_user",
                "password": ""
            },
            "kafka": {
                "brokers": ["kafka.dev.example.com:9092"]
            },
            "redis": {
                "host": "redis.dev.example.com",
                "port": 6379
            }
        }
    }
}
`,

    'package.json': `{
    "name": "my-stagehand-project",
    "version": "1.0.0",
    "description": "Playwright test project powered by @inluxc/stagehand",
    "scripts": {
        "test": "npx playwright test",
        "test:specs": "npx playwright test --project=specs",
        "test:browser": "npx playwright test --project=browser-chromium",
        "test:mobile": "npx playwright test --project=mobile-ios",
        "test:tag": "npx playwright test --grep",
        "typecheck": "tsc --noEmit"
    },
    "dependencies": {
        "@inluxc/stagehand": "^1.0.0",
        "@playwright/test": "^1.52.0"
    },
    "devDependencies": {
        "@types/node": "^22.0.0",
        "typescript": "^5.6.0"
    },
    "engines": {
        "node": ">=18.0.0"
    }
}
`,

    'tsconfig.json': `{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true,
        "sourceMap": true,
        "outDir": "./dist",
        "rootDir": ".",
        "baseUrl": ".",
        "paths": {
            "@pages/*": ["./tests/pages/*"],
            "@utils/*": ["./tests/utils/*"],
            "@fixtures/*": ["./tests/fixtures/*"],
            "@data/*": ["./tests/data/*"],
            "@models/*": ["./tests/models/*"]
        }
    },
    "include": [
        "tests/**/*.ts",
        "playwright.config.ts"
    ],
    "exclude": [
        "node_modules",
        "dist"
    ]
}
`,

    'AGENTS.md': `# AI Agent Instructions

## Project Overview

Playwright test project using @inluxc/stagehand fixture framework.

## Structure

\`\`\`
tests/
├── specs/       # Test spec files (*.spec.ts, *.browser.ts, *.mobile.ts)
├── pages/       # Page Object Model classes
├── utils/       # Test utilities and helpers
├── fixtures/    # Custom test fixtures
├── data/        # Fixed test data (JSON/YAML)
├── models/      # Database models and schemas
└── config/      # Test configuration files
\`\`\`

## Conventions

- Import \`test\` and \`expect\` from \`@inluxc/stagehand\`
- Page objects go in \`tests/pages/\` with \`.page.ts\` suffix
- Test data goes in \`tests/data/\` as JSON or YAML files
- Custom fixtures extend the base in \`tests/fixtures/\`
- Use parameterized queries for all database operations
- Follow AAA pattern: Arrange, Act, Assert
`,

    'SKILLS.md': `# AI Skills

## Skill 1: Create a Spec Test

Create files in \`tests/specs/\` with \`.spec.ts\` extension.

\`\`\`typescript
import { test, expect } from '@inluxc/stagehand';

test.describe('Feature Name', () => {
    test('should do something', async ({ openApiClient }) => {
        // Arrange
        // Act
        // Assert
    });
});
\`\`\`

## Skill 2: Create a Page Object

Create files in \`tests/pages/\` with \`.page.ts\` extension.

\`\`\`typescript
import { Page } from '@playwright/test';

export class LoginPage {
    constructor(private page: Page) {}

    readonly emailInput = this.page.getByLabel('Email');
    readonly passwordInput = this.page.getByLabel('Password');
    readonly submitButton = this.page.getByRole('button', { name: 'Sign In' });

    async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }
}
\`\`\`

## Skill 3: Create a Custom Fixture

Create files in \`tests/fixtures/\` with \`.fixture.ts\` extension.

\`\`\`typescript
import { test as base } from '@inluxc/stagehand';

export const test = base.extend<{ myFixture: MyType }>({
    myFixture: async ({}, use) => {
        const instance = await setup();
        await use(instance);
        await teardown(instance);
    },
});
\`\`\`
`,

    // ─── Directory starter files ─────────────────────────────────────────────

    'tests/specs/.gitkeep': '',

    'tests/pages/example.page.ts': `import type { Page } from '@playwright/test';

/**
 * Example Page Object Model.
 * Create one class per page/component for reusable interactions.
 */
export class ExamplePage {
    constructor(private page: Page) {}

    // Locators
    readonly heading = this.page.getByRole('heading', { level: 1 });
    readonly navLinks = this.page.getByRole('navigation').getByRole('link');

    // Actions
    async navigate() {
        await this.page.goto('/');
    }

    async getTitle(): Promise<string> {
        return this.page.title();
    }
}
`,

    'tests/utils/index.ts': `/**
 * Test utilities and helpers.
 * Add shared helper functions used across multiple test files.
 */

/**
 * Generate a unique test identifier to avoid collisions.
 */
export function uniqueId(prefix = 'test'): string {
    return \`\${prefix}-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;
}

/**
 * Wait for a condition with timeout.
 */
export async function waitFor(
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number } = {},
): Promise<void> {
    const { timeout = 10_000, interval = 500 } = options;
    const start = Date.now();

    while (Date.now() - start < timeout) {
        if (await condition()) return;
        await new Promise((r) => setTimeout(r, interval));
    }

    throw new Error(\`waitFor timed out after \${timeout}ms\`);
}
`,

    'tests/fixtures/index.ts': `/**
 * Custom fixtures for this project.
 * Extend the base stagehand fixtures here.
 *
 * Example:
 *   import { test as base } from '@inluxc/stagehand';
 *   export const test = base.extend<{ myFixture: MyType }>({ ... });
 */
export {};
`,

    'tests/data/users.json': `[
    {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "admin"
    },
    {
        "id": 2,
        "name": "Bob",
        "email": "bob@example.com",
        "role": "user"
    }
]
`,

    'tests/models/index.ts': `/**
 * Database models and type definitions.
 * Define interfaces that match your database schema.
 */

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    created_at?: string;
    updated_at?: string;
}

export interface Order {
    id: number;
    user_id: number;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    amount: number;
    created_at?: string;
}
`,

    'tests/config/index.ts': `/**
 * Test-specific configuration helpers.
 * Use this for test environment setup, feature flags, etc.
 */

export const testConfig = {
    /** Default timeout for async operations in tests */
    defaultTimeout: 10_000,

    /** Whether to run tests that require external services */
    skipExternalServices: process.env.SKIP_EXTERNAL === 'true',

    /** Base URL override for tests */
    baseUrl: process.env.PW_OPENAPI_BASE_URL ?? 'http://localhost:3000',
};
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI Logic
// ─────────────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command !== 'init') {
        console.log(`
  @inluxc/stagehand CLI

  Usage:
    npx stagehand init [directory]

  Commands:
    init    Scaffold a new Stagehand project structure

  Options:
    --help  Show this help message
`);
        process.exit(0);
    }

    const targetDir = path.resolve(args[1] || '.');
    const isCurrentDir = targetDir === process.cwd();

    console.log('');
    console.log('  🎭 Stagehand — Initializing project...');
    console.log(`  📁 Target: ${isCurrentDir ? '.' : path.relative(process.cwd(), targetDir)}`);
    console.log('');

    // Create directories
    for (const dir of DIRECTORIES) {
        const fullPath = path.join(targetDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`  ✓ Created ${dir}/`);
        } else {
            console.log(`  · Exists  ${dir}/`);
        }
    }

    console.log('');

    // Create files (skip if already exists)
    let created = 0;
    let skipped = 0;

    for (const [filePath, content] of Object.entries(FILES)) {
        const fullPath = path.join(targetDir, filePath);
        const dir = path.dirname(fullPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (fs.existsSync(fullPath)) {
            console.log(`  · Skipped ${filePath} (already exists)`);
            skipped++;
        } else {
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`  ✓ Created ${filePath}`);
            created++;
        }
    }

    console.log('');
    console.log(`  Done! Created ${created} files, skipped ${skipped} existing.`);
    console.log('');
    console.log('  Next steps:');
    console.log('    1. npm install');
    console.log('    2. npx playwright install');
    console.log('    3. Update environments.json with your service URLs');
    console.log('    4. Create your first spec: tests/specs/my-feature.spec.ts');
    console.log('');
}

main();
