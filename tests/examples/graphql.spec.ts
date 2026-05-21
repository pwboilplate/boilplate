/**
 * GraphQL Fixture — Example Tests
 *
 * Demonstrates usage of the graphqlClient fixture for querying
 * and mutating data via a GraphQL API endpoint.
 *
 * Prerequisites:
 *   - PW_GRAPHQL_ENDPOINT set to a valid GraphQL endpoint URL
 *   - Optionally PW_GRAPHQL_AUTH_TOKEN for authenticated APIs
 */

import { test, expect } from '../../src';

test.describe('GraphQL Client', () => {
    test.skip(
        !process.env['PW_GRAPHQL_ENDPOINT'],
        'Skipped: PW_GRAPHQL_ENDPOINT not configured',
    );

    test('should execute a query and return data', async ({ graphqlClient }) => {
        const query = `
            query {
                __schema {
                    queryType {
                        name
                    }
                }
            }
        `;

        const data = await graphqlClient.query<{
            __schema: { queryType: { name: string } };
        }>(query);

        expect(data.__schema.queryType.name).toBe('Query');
    });

    test('should execute a query with variables', async ({ graphqlClient }) => {
        const query = `
            query GetType($name: String!) {
                __type(name: $name) {
                    name
                    kind
                }
            }
        `;

        const data = await graphqlClient.query<{
            __type: { name: string; kind: string } | null;
        }>(query, { name: 'String' });

        expect(data.__type).not.toBeNull();
        expect(data.__type!.name).toBe('String');
        expect(data.__type!.kind).toBe('SCALAR');
    });

    test('should handle raw request with full response', async ({ graphqlClient }) => {
        const query = `
            query {
                __schema {
                    queryType {
                        name
                    }
                }
            }
        `;

        const response = await graphqlClient.rawRequest<{
            __schema: { queryType: { name: string } };
        }>(query);

        expect(response.data.__schema.queryType.name).toBe('Query');
        expect(response.errors).toBeUndefined();
    });

    test('should support setting auth token dynamically', async ({ graphqlClient }) => {
        // Set a token dynamically (useful for login flows)
        graphqlClient.setAuthToken('test-token-123');

        // Introspection should still work regardless of auth
        const data = await graphqlClient.query<{
            __schema: { queryType: { name: string } };
        }>(`{ __schema { queryType { name } } }`);

        expect(data.__schema.queryType.name).toBe('Query');
    });

    test('should support custom headers per request', async ({ graphqlClient }) => {
        const data = await graphqlClient.query<{
            __schema: { queryType: { name: string } };
        }>(
            `{ __schema { queryType { name } } }`,
            undefined,
            { headers: { 'X-Custom-Header': 'test-value' } },
        );

        expect(data.__schema.queryType.name).toBe('Query');
    });

    test('should return errors for invalid queries via rawRequest', async ({ graphqlClient }) => {
        const response = await graphqlClient.rawRequest(`{ nonExistentField }`);

        expect(response.errors).toBeDefined();
        expect(response.errors!.length).toBeGreaterThan(0);
        expect(response.errors![0].message).toBeDefined();
    });
});
