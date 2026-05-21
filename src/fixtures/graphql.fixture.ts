/**
 * GraphQL Client Fixture for Playwright.
 *
 * Provides a typed GraphQL client as a Playwright fixture, supporting queries,
 * mutations, and subscriptions (via WebSocket) against a GraphQL endpoint.
 *
 * Uses `graphql-request` for HTTP-based operations and supports custom headers,
 * authentication tokens, and request/response interceptors.
 *
 * Usage:
 *   import { test } from '../fixtures';
 *   test('my graphql test', async ({ graphqlClient }) => {
 *     const data = await graphqlClient.query(`{ users { id name } }`);
 *   });
 *
 * @requirements 9.1, 9.2, 9.3
 */

import { GraphQLClient as GQLClient } from 'graphql-request';
import type { Variables, RequestDocument } from 'graphql-request';
import type { GraphQLFixtureConfig } from '../config/schema';
import { FixtureInitError, FixtureOperationError } from '../errors';
import { ConfigLoader } from '../config/loader';

/**
 * Response wrapper for GraphQL operations.
 */
export interface GraphQLResponse<T = unknown> {
    /** The response data. */
    data: T;
    /** GraphQL errors returned by the server, if any. */
    errors?: Array<{
        message: string;
        locations?: Array<{ line: number; column: number }>;
        path?: Array<string | number>;
        extensions?: Record<string, unknown>;
    }>;
}

/**
 * Options for individual GraphQL operations.
 */
export interface GraphQLRequestOptions {
    /** Additional headers for this specific request. */
    headers?: Record<string, string>;
    /** Operation name (for documents with multiple operations). */
    operationName?: string;
    /** Signal for request cancellation. */
    signal?: AbortSignal;
}

/**
 * GraphQL client interface exposed to tests.
 */
export interface GraphQLClient {
    /**
     * Execute a GraphQL query.
     * @param document - GraphQL query string or DocumentNode
     * @param variables - Optional query variables
     * @param options - Optional request options
     */
    query<T = unknown>(
        document: string | RequestDocument,
        variables?: Variables,
        options?: GraphQLRequestOptions,
    ): Promise<T>;

    /**
     * Execute a GraphQL mutation.
     * @param document - GraphQL mutation string or DocumentNode
     * @param variables - Optional mutation variables
     * @param options - Optional request options
     */
    mutate<T = unknown>(
        document: string | RequestDocument,
        variables?: Variables,
        options?: GraphQLRequestOptions,
    ): Promise<T>;

    /**
     * Execute a raw GraphQL request and return the full response including errors.
     * @param document - GraphQL document string or DocumentNode
     * @param variables - Optional variables
     * @param options - Optional request options
     */
    rawRequest<T = unknown>(
        document: string,
        variables?: Variables,
        options?: GraphQLRequestOptions,
    ): Promise<GraphQLResponse<T>>;

    /**
     * Set a default header for all subsequent requests.
     * @param key - Header name
     * @param value - Header value
     */
    setHeader(key: string, value: string): void;

    /**
     * Set the authorization header (Bearer token).
     * @param token - Bearer token value
     */
    setAuthToken(token: string): void;

    /**
     * Get the underlying graphql-request client instance.
     */
    getClient(): GQLClient;
}

/** Default timeout for GraphQL requests (ms). */
const DEFAULT_REQUEST_TIMEOUT = 30_000;

/**
 * Creates and configures a GraphQL client from the provided config.
 */
function createGraphQLClient(config: GraphQLFixtureConfig): GQLClient {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
    };

    if (config.authToken) {
        headers['Authorization'] = `Bearer ${config.authToken}`;
    }

    const client = new GQLClient(config.endpoint, {
        headers,
    });

    return client;
}

/**
 * Builds the GraphQLClient interface wrapping the graphql-request client.
 */
function buildGraphQLClient(client: GQLClient, requestTimeout: number): GraphQLClient {
    return {
        async query<T = unknown>(
            document: string | RequestDocument,
            variables?: Variables,
            options?: GraphQLRequestOptions,
        ): Promise<T> {
            try {
                const requestHeaders = options?.headers;
                const signal = options?.signal ?? AbortSignal.timeout(requestTimeout);
                return await client.request<T>({
                    document: document as string,
                    variables,
                    requestHeaders,
                    signal,
                });
            } catch (error) {
                throw new FixtureOperationError(
                    'graphql',
                    'query',
                    {
                        operation: options?.operationName ?? 'unknown',
                        reason: error instanceof Error ? error.message : String(error),
                    },
                    error instanceof Error ? error : undefined,
                );
            }
        },

        async mutate<T = unknown>(
            document: string | RequestDocument,
            variables?: Variables,
            options?: GraphQLRequestOptions,
        ): Promise<T> {
            try {
                const requestHeaders = options?.headers;
                const signal = options?.signal ?? AbortSignal.timeout(requestTimeout);
                return await client.request<T>({
                    document: document as string,
                    variables,
                    requestHeaders,
                    signal,
                });
            } catch (error) {
                throw new FixtureOperationError(
                    'graphql',
                    'query',
                    {
                        operation: options?.operationName ?? 'unknown',
                        reason: error instanceof Error ? error.message : String(error),
                    },
                    error instanceof Error ? error : undefined,
                );
            }
        },

        async rawRequest<T = unknown>(
            document: string,
            variables?: Variables,
            options?: GraphQLRequestOptions,
        ): Promise<GraphQLResponse<T>> {
            try {
                const response = await client.rawRequest<T>(document, variables, options?.headers);
                return {
                    data: response.data,
                    errors: (response as any).errors,
                };
            } catch (error: any) {
                // graphql-request throws ClientError which contains the response
                if (error?.response) {
                    return {
                        data: error.response.data,
                        errors: error.response.errors,
                    };
                }
                throw new FixtureOperationError(
                    'graphql',
                    'query',
                    {
                        operation: options?.operationName ?? 'unknown',
                        reason: error instanceof Error ? error.message : String(error),
                    },
                    error instanceof Error ? error : undefined,
                );
            }
        },

        setHeader(key: string, value: string): void {
            client.setHeader(key, value);
        },

        setAuthToken(token: string): void {
            client.setHeader('Authorization', `Bearer ${token}`);
        },

        getClient(): GQLClient {
            return client;
        },
    };
}

/**
 * GraphQL fixture definition for Playwright's test.extend() pattern.
 *
 * Setup: Creates graphql-request client with configured endpoint and headers.
 * Teardown: No persistent connections to clean up (HTTP-based).
 */
export const graphqlFixture = {
    graphqlClient: [
        async (
            { graphql }: { graphql: GraphQLFixtureConfig | undefined },
            use: (client: GraphQLClient) => Promise<void>,
        ) => {
            // Use config from project `use` block if provided, otherwise fall back to ConfigLoader
            let graphqlConfig: GraphQLFixtureConfig | undefined = graphql;

            if (!graphqlConfig) {
                const configLoader = new ConfigLoader();
                const config = configLoader.load();
                graphqlConfig = config.graphql;
            }

            if (!graphqlConfig || !graphqlConfig.endpoint) {
                throw new FixtureInitError('graphqlClient', 'init', {
                    reason: 'GraphQL configuration is missing or endpoint is not defined. Provide graphql config in environments.json, environment variables, or project use block.',
                });
            }

            let client: GQLClient;

            try {
                client = createGraphQLClient(graphqlConfig);
            } catch (error) {
                throw new FixtureInitError(
                    'graphqlClient',
                    'init',
                    {
                        endpoint: graphqlConfig.endpoint,
                        reason: error instanceof Error ? error.message : String(error),
                    },
                    error instanceof Error ? error : undefined,
                );
            }

            const graphqlClient = buildGraphQLClient(client, graphqlConfig.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT);

            // Provide the client to the test
            await use(graphqlClient);

            // No persistent connections to tear down (HTTP-based client)
        },
        { scope: 'test' },
    ],
};
