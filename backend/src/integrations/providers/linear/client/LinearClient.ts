import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";

export interface LinearClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GraphQLResponse<T = unknown> {
    data?: T;
    errors?: Array<{
        message: string;
        extensions?: { code?: string };
    }>;
}

/**
 * Linear GraphQL API Client with connection pooling and error handling
 */
export class LinearClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: LinearClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.linear.app",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);
        this.accessToken = config.accessToken;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Execute GraphQL query or mutation
     */
    async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
        const response = await this.post<GraphQLResponse<T>>("/graphql", {
            query,
            variables
        });

        if (response.errors && response.errors.length > 0) {
            const error = response.errors[0];
            throw new Error(`Linear API error: ${error.message}`);
        }

        if (!response.data) {
            throw new Error("Linear API returned no data");
        }

        return response.data;
    }

    /**
     * Override request to handle Linear-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<GraphQLResponse<T>>(config);
        return response as T;
    }

    /**
     * Handle Linear-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Linear errors
            if (status === 401) {
                throw new Error("Linear authentication failed. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("You don't have permission to access this Linear resource.");
            }

            if (status === 404) {
                throw new Error("Linear resource not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Linear rate limit exceeded. Retry after ${retryAfter || "unknown"} seconds.`
                );
            }

            // Handle GraphQL errors in response body
            if ((data as GraphQLResponse).errors) {
                const graphqlError = (data as GraphQLResponse).errors![0];
                throw new Error(`Linear API error: ${graphqlError.message}`);
            }
        }

        throw error;
    }

    /**
     * Helper method for creating an issue
     */
    async createIssue(params: {
        teamId: string;
        title: string;
        description?: string;
        assigneeId?: string;
        priority?: number;
        stateId?: string;
        labelIds?: string[];
    }): Promise<unknown> {
        return this.query(
            `mutation IssueCreate($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                    success
                    issue {
                        id
                        title
                        identifier
                        url
                        createdAt
                    }
                }
            }`,
            { input: params }
        );
    }

    /**
     * Helper method for updating an issue
     */
    async updateIssue(params: {
        id: string;
        title?: string;
        description?: string;
        assigneeId?: string;
        priority?: number;
        stateId?: string;
        labelIds?: string[];
    }): Promise<unknown> {
        const { id, ...input } = params;
        return this.query(
            `mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
                issueUpdate(id: $id, input: $input) {
                    success
                    issue {
                        id
                        title
                        identifier
                        url
                        updatedAt
                    }
                }
            }`,
            { id, input }
        );
    }

    /**
     * Helper method for getting a single issue
     */
    async getIssue(id: string): Promise<unknown> {
        return this.query(
            `query Issue($id: String!) {
                issue(id: $id) {
                    id
                    title
                    description
                    identifier
                    url
                    createdAt
                    updatedAt
                    priority
                    state {
                        id
                        name
                        color
                        type
                    }
                    assignee {
                        id
                        name
                        email
                    }
                    team {
                        id
                        name
                        key
                    }
                    labels {
                        nodes {
                            id
                            name
                            color
                        }
                    }
                }
            }`,
            { id }
        );
    }

    /**
     * Helper method for listing issues
     */
    async listIssues(params?: {
        teamId?: string;
        first?: number;
        after?: string;
        filter?: Record<string, unknown>;
    }): Promise<unknown> {
        return this.query(
            `query Issues($first: Int, $after: String, $filter: IssueFilter) {
                issues(first: $first, after: $after, filter: $filter) {
                    nodes {
                        id
                        title
                        identifier
                        url
                        priority
                        createdAt
                        state {
                            id
                            name
                            color
                        }
                        assignee {
                            id
                            name
                            email
                        }
                        team {
                            id
                            name
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }`,
            params
        );
    }

    /**
     * Helper method for listing teams
     */
    async listTeams(): Promise<unknown> {
        return this.query(
            `query Teams {
                teams {
                    nodes {
                        id
                        name
                        key
                        description
                    }
                }
            }`
        );
    }

    /**
     * Helper method for listing users
     */
    async listUsers(): Promise<unknown> {
        return this.query(
            `query Users {
                users {
                    nodes {
                        id
                        name
                        email
                        active
                    }
                }
            }`
        );
    }

    /**
     * Helper method for listing workflow states for a team
     */
    async listWorkflowStates(teamId: string): Promise<unknown> {
        return this.query(
            `query WorkflowStates($teamId: String!) {
                team(id: $teamId) {
                    states {
                        nodes {
                            id
                            name
                            color
                            type
                            position
                        }
                    }
                }
            }`,
            { teamId }
        );
    }
}
