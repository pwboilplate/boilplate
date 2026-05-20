/**
 * OTP (One-Time Password) fixture for the Playwright Framework Template.
 *
 * Provides TOTP and HOTP generation/verification using otplib v13.
 * Useful for testing 2FA/MFA flows where time-based or counter-based
 * one-time passwords need to be generated during test execution.
 *
 * @requirements 8.1, 8.2, 8.3
 */

import { TOTP, HOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import type { OtpFixtureConfig } from '../config/schema';
import { FixtureInitError } from '../errors';

/**
 * OTP client interface exposed to tests.
 */
export interface OtpClient {
    /**
     * Generate a TOTP token for the configured or provided secret.
     * Uses the current system time.
     */
    generateTotp(secret?: string): Promise<string>;

    /**
     * Verify a TOTP token against the configured or provided secret.
     * Accounts for time drift within the configured window.
     */
    verifyTotp(token: string, secret?: string): Promise<boolean>;

    /**
     * Generate an HOTP token for the given counter value.
     */
    generateHotp(counter: number, secret?: string): Promise<string>;

    /**
     * Verify an HOTP token against the given counter value.
     */
    verifyHotp(token: string, counter: number, secret?: string): Promise<boolean>;

    /**
     * Generate a new random secret (base32 encoded).
     * Useful for test setup when provisioning 2FA for a user.
     */
    generateSecret(): string;

    /**
     * Generate an otpauth:// URI for QR code provisioning.
     */
    generateKeyUri(accountName: string, issuer?: string, secret?: string): string;
}

/**
 * Resolves the secret, throwing a descriptive error if none is available.
 */
function resolveSecret(secret: string | undefined, defaultSecret: string | undefined, method: string): string {
    const s = secret ?? defaultSecret;
    if (!s) {
        throw new FixtureInitError('otp', 'init', {
            reason: `No secret provided. Pass a secret to ${method}() or configure one in the OTP fixture config.`,
        });
    }
    return s;
}

/**
 * Creates an OTP client configured with the provided options.
 */
function createOtpClient(config: OtpFixtureConfig): OtpClient {
    const crypto = new NobleCryptoPlugin();
    const base32 = new ScureBase32Plugin();

    const totpInstance = new TOTP({
        crypto,
        base32,
        secret: config.secret,
        digits: config.digits,
        period: config.period,
        algorithm: config.algorithm,
        issuer: config.issuer,
    });

    const hotpInstance = new HOTP({
        crypto,
        base32,
        secret: config.secret,
        digits: config.digits,
        algorithm: config.algorithm,
        issuer: config.issuer,
    });

    const defaultSecret = config.secret;

    // Compute epochTolerance from window config
    // window=1 with period=30 means ±30 seconds tolerance
    const epochTolerance = config.window !== undefined
        ? (config.window * (config.period ?? 30))
        : undefined;

    return {
        async generateTotp(secret?: string): Promise<string> {
            const s = resolveSecret(secret, defaultSecret, 'generateTotp');
            return totpInstance.generate({ secret: s });
        },

        async verifyTotp(token: string, secret?: string): Promise<boolean> {
            const s = resolveSecret(secret, defaultSecret, 'verifyTotp');
            const result = await totpInstance.verify(token, {
                secret: s,
                ...(epochTolerance !== undefined ? { epochTolerance } : {}),
            });
            return result.valid;
        },

        async generateHotp(counter: number, secret?: string): Promise<string> {
            const s = resolveSecret(secret, defaultSecret, 'generateHotp');
            return hotpInstance.generate(counter, { secret: s });
        },

        async verifyHotp(token: string, counter: number, secret?: string): Promise<boolean> {
            const s = resolveSecret(secret, defaultSecret, 'verifyHotp');
            const result = await hotpInstance.verify({ token, counter }, { secret: s });
            return result.valid;
        },

        generateSecret(): string {
            return totpInstance.generateSecret();
        },

        generateKeyUri(accountName: string, issuer?: string, secret?: string): string {
            const s = resolveSecret(secret, defaultSecret, 'generateKeyUri');
            return totpInstance.toURI({
                label: accountName,
                issuer: issuer ?? config.issuer,
                secret: s,
            });
        },
    };
}

/**
 * OTP fixture definition for Playwright's test.extend() pattern.
 *
 * Setup: Creates OTP client with configured algorithm, digits, period, and window.
 * Teardown: No cleanup needed (stateless).
 */
export const otpFixture = {
    otpClient: async (
        { otpConfig }: { otpConfig: OtpFixtureConfig },
        use: (client: OtpClient) => Promise<void>
    ) => {
        const client = createOtpClient(otpConfig);
        await use(client);
    },
};
