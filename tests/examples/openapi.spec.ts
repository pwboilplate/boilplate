/**
 * OpenAPI Fixture — Example Test
 *
 * Demonstrates how to use the OpenAPI client fixture to call API operations
 * defined in an OpenAPI specification. The fixture automatically initializes
 * the client with typed operation methods and handles teardown.
 *
 * Prerequisites:
 *   - A valid OpenAPI spec path configured in environments.json or via PW_OPENAPI_SPEC_PATH
 *   - The target API server running and accessible
 *
 * This example uses the Petstore v2 spec (https://petstore.swagger.io/v2/swagger.json)
 * with a Prism mock server in CI.
 *
 * @requirements 7.3, 1.6
 */

import { test, expect } from '../../src';

test.describe('OpenAPI Fixture Examples', () => {
    // These tests require a running API server and valid OpenAPI spec.
    // Skip when not running in CI where infrastructure is available.
    test.skip(!process.env.CI, 'Skipped: requires CI infrastructure');

    test('initialize client and call an operation', async ({ openApiClient }) => {
        // The openApiClient fixture provides:
        //   - client: an Axios instance extended with operation methods from the spec
        //   - api: the underlying OpenAPIClientAxios instance for advanced usage

        const { client } = openApiClient;

        // Call an operation defined in the OpenAPI spec by its operationId.
        // The Petstore spec defines: operationId: "getInventory" (requires api_key header)
        const response = await (client as any).getInventory(null, null, {
            headers: { api_key: 'special-key' },
        });

        // Validate the response — getInventory returns a map of status to count
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
        expect(typeof response.data).toBe('object');
    });

    test('call operation with parameters', async ({ openApiClient }) => {
        const { client } = openApiClient;

        // Operations with path parameters pass them as the first argument.
        // The Petstore spec defines: operationId: "getOrderById" with path param {orderId}
        // This endpoint has no security requirement.
        const response = await (client as any).getOrderById({ orderId: 1 });

        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
        expect(response.data.id).toBeDefined();
    });

    test('call operation with request body', async ({ openApiClient }) => {
        const { client } = openApiClient;

        // POST operations pass the request body as the second argument.
        // The Petstore spec defines: operationId: "placeOrder" (no security requirement)
        const response = await (client as any).placeOrder(null, {
            petId: 1,
            quantity: 1,
            status: 'placed',
            complete: true,
        });

        // placeOrder returns 200 on success per the Petstore spec
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
        expect(response.data.petId).toBe(1);
    });

    test('access the underlying OpenAPIClientAxios instance', async ({ openApiClient }) => {
        const { api } = openApiClient;

        // The api instance gives access to the parsed OpenAPI document
        // and can be used for advanced scenarios like inspecting available operations.
        const operations = api.getOperations();

        expect(operations.length).toBeGreaterThan(0);
    });
});
