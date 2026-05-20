/**
 * Example tests for the OTP (One-Time Password) fixture.
 *
 * Demonstrates TOTP and HOTP generation/verification for 2FA/MFA testing flows.
 */

import { test, expect } from '../../src';

test.describe('OTP Fixture — TOTP', () => {
    test('generate and verify a TOTP token', async ({ otpClient }) => {
        const secret = otpClient.generateSecret();
        const token = await otpClient.generateTotp(secret);

        expect(token).toMatch(/^\d{6}$/);

        const isValid = await otpClient.verifyTotp(token, secret);
        expect(isValid).toBe(true);
    });

    test('reject an invalid TOTP token', async ({ otpClient }) => {
        const secret = otpClient.generateSecret();

        const isValid = await otpClient.verifyTotp('000000', secret);
        expect(isValid).toBe(false);
    });

    test('generate a secret in base32 format', async ({ otpClient }) => {
        const secret = otpClient.generateSecret();

        // Base32 characters: A-Z and 2-7
        expect(secret).toMatch(/^[A-Z2-7]+$/);
        expect(secret.length).toBeGreaterThanOrEqual(16);
    });
});

test.describe('OTP Fixture — HOTP', () => {
    test('generate and verify an HOTP token', async ({ otpClient }) => {
        const secret = otpClient.generateSecret();
        const counter = 42;

        const token = await otpClient.generateHotp(counter, secret);
        expect(token).toMatch(/^\d{6}$/);

        const isValid = await otpClient.verifyHotp(token, counter, secret);
        expect(isValid).toBe(true);
    });

    test('HOTP token is counter-specific', async ({ otpClient }) => {
        const secret = otpClient.generateSecret();

        const token = await otpClient.generateHotp(1, secret);

        // Same token should not verify against a different counter
        const isValid = await otpClient.verifyHotp(token, 2, secret);
        expect(isValid).toBe(false);
    });
});

test.describe('OTP Fixture — Key URI', () => {
    test('generate an otpauth URI for QR provisioning', async ({ otpClient }) => {
        const secret = otpClient.generateSecret();

        const uri = otpClient.generateKeyUri('user@example.com', 'MyApp', secret);

        expect(uri).toContain('otpauth://totp/');
        expect(uri).toContain('secret=');
        expect(uri).toContain('issuer=MyApp');
    });
});
