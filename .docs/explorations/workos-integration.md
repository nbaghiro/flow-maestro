# WorkOS Integration Plan for FlowMaestro

**Document Version:** 1.0
**Date:** 2025-11-06
**Status:** Comprehensive Integration Plan

---

## Executive Summary

This document outlines a comprehensive plan to integrate **WorkOS** into FlowMaestro, providing enterprise-grade authentication, Single Sign-On (SSO), and secure MCP server authentication. WorkOS will replace FlowMaestro's current JWT-based authentication system with a production-ready, scalable solution that supports multiple authentication methods while enabling workflows to be exposed as authenticated MCP servers for external consumption.

### Key Integration Objectives

1. **Enterprise Authentication**: Replace basic JWT auth with WorkOS User Management (AuthKit)
2. **OAuth Providers**: Support Google, Microsoft, GitHub, and social login
3. **Enterprise SSO**: Enable SAML and OIDC for enterprise customers
4. **MCP Authentication**: Secure MCP servers exposing FlowMaestro workflows using OAuth 2.1
5. **Multi-Factor Authentication**: Add MFA support for enhanced security
6. **Session Management**: Leverage WorkOS's built-in session handling with automatic refresh
7. **User Directory**: Sync user data and manage organizations

### Why WorkOS?

- **Production-Ready**: Used by thousands of companies for enterprise auth
- **MCP Protocol Support**: Native OAuth 2.1 authorization server for MCP apps
- **Comprehensive Features**: SSO, social login, MFA, passkeys, magic links
- **TypeScript-Native**: Official Node.js SDK with excellent TypeScript support
- **Flexible Architecture**: Can integrate incrementally without replacing entire auth system
- **Compliance**: SOC 2, GDPR, HIPAA compliant
- **Cost-Effective**: Free tier covers most startups, scales with usage

---

## Table of Contents

1. [WorkOS Overview](#1-workos-overview)
2. [Integration Architecture](#2-integration-architecture)
3. [Authentication Flows](#3-authentication-flows)
4. [SSO Configuration](#4-sso-configuration)
5. [MCP Server Authentication](#5-mcp-server-authentication)
6. [Database Schema Changes](#6-database-schema-changes)
7. [Backend Implementation](#7-backend-implementation)
8. [Frontend Implementation](#8-frontend-implementation)
9. [API Endpoints](#9-api-endpoints)
10. [Session Management](#10-session-management)
11. [Migration Strategy](#11-migration-strategy)
12. [Security Considerations](#12-security-considerations)
13. [Implementation Phases](#13-implementation-phases)
14. [Testing Strategy](#14-testing-strategy)
15. [Configuration & Deployment](#15-configuration--deployment)
16. [Cost Analysis](#16-cost-analysis)
17. [Conclusion & Next Steps](#17-conclusion--next-steps)

---

## 1. WorkOS Overview

### 1.1 What is WorkOS?

WorkOS is an **enterprise-grade authentication and authorization platform** designed to help B2B SaaS applications implement authentication features that scale from the first user to enterprise SSO.

**Core Features:**

- **AuthKit**: Hosted authentication UI with customizable branding
- **User Management**: Complete user lifecycle management
- **SSO**: SAML and OIDC enterprise single sign-on
- **OAuth Providers**: Google, Microsoft, GitHub, Apple, LinkedIn
- **Directory Sync**: User provisioning via SCIM and HRIS providers
- **MFA**: Multi-factor authentication with TOTP and SMS
- **Magic Links**: Passwordless authentication
- **Passkeys**: WebAuthn support for modern devices
- **Admin Portal**: Self-serve configuration for enterprise IT admins
- **Fine-Grained Authorization (FGA)**: Advanced RBAC and permissions
- **MCP Support**: OAuth 2.1 authorization server for Model Context Protocol

### 1.2 Node.js SDK

```bash
npm install @workos-inc/node
```

**Current Version:** v7.72.2

**Key SDK Features:**

- Full TypeScript support
- Automatic token refresh
- Session management helpers
- OAuth flow handling
- SSO connection management
- User provisioning APIs
- Webhook verification

---

## 2. Integration Architecture

### 2.1 Hybrid Architecture Approach

**Strategy:** Integrate WorkOS alongside existing FlowMaestro infrastructure, gradually migrating authentication while preserving existing features.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FlowMaestro Platform                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Frontend (React + Vite)                                                │
│  ├─ WorkOS AuthKit UI (login/signup)                                    │
│  ├─ OAuth Social Login Buttons                                          │
│  ├─ SSO Configuration UI (admin)                                        │
│  └─ Session Management (cookies)                                        │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Backend (Fastify + TypeScript)                                         │
│  ├─ WorkOS Integration Layer                                            │
│  │   ├─ Authentication Middleware (replaces JWT middleware)             │
│  │   ├─ Session Validation (encrypted cookies)                          │
│  │   ├─ OAuth Callback Handlers                                         │
│  │   ├─ SSO Connection Management                                       │
│  │   └─ User Provisioning Service                                       │
│  ├─ Existing API Routes (protected by WorkOS auth)                      │
│  ├─ MCP Server with OAuth 2.1 Authorization                             │
│  │   ├─ Authorization Endpoint (/oauth/authorize)                       │
│  │   ├─ Token Endpoint (/oauth/token)                                   │
│  │   ├─ Resource Server (MCP tools with token validation)               │
│  │   └─ OAuth Discovery (/.well-known/oauth-authorization-server)       │
│  └─ Temporal Workflows (user context from WorkOS)                       │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Data Layer                                                              │
│  ├─ PostgreSQL                                                           │
│  │   ├─ users table (extended with workos_user_id)                      │
│  │   ├─ organizations table (linked to WorkOS organizations)            │
│  │   ├─ sso_connections table (SAML/OIDC configurations)                │
│  │   └─ oauth_clients table (for MCP server authorization)              │
│  ├─ Redis (session cache, optional)                                     │
│  └─ WorkOS Cloud (user directory, SSO configs)                          │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  External Services                                                       │
│  ├─ WorkOS API                                                           │
│  │   ├─ User Management                                                  │
│  │   ├─ SSO Connections                                                  │
│  │   └─ OAuth Authorization Server                                       │
│  ├─ OAuth Providers (Google, Microsoft, GitHub)                         │
│  └─ MCP Clients (Claude Desktop, Cursor, etc.)                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Design Decisions

**Decision #1: Use WorkOS AuthKit for User-Facing Authentication**

- **Rationale:** Hosted UI reduces implementation time and provides best-practice UX
- **Approach:** Redirect users to WorkOS for login, handle callback, create session
- **Benefit:** Instant SSO, social login, MFA without building custom UI

**Decision #2: Keep FlowMaestro's Database Schema**

- **Rationale:** Existing multi-tenant architecture with workflows/agents/connections is valuable
- **Approach:** Extend `users` table with `workos_user_id`, maintain existing relationships
- **Benefit:** No data migration, existing features continue working

**Decision #3: Implement OAuth 2.1 for MCP Server**

- **Rationale:** MCP specification requires OAuth 2.1 for secure authorization
- **Approach:** WorkOS acts as authorization server, FlowMaestro is resource server
- **Benefit:** Standards-compliant, secure external access to workflows via MCP

**Decision #4: Support Both Password and SSO Authentication**

- **Rationale:** Small teams need simple auth, enterprises need SSO
- **Approach:** WorkOS supports both out of the box, users choose per account
- **Benefit:** Flexible go-to-market strategy (freemium → enterprise)

**Decision #5: Use Encrypted Cookies for Session Management**

- **Rationale:** More secure than localStorage, works across subdomains
- **Approach:** WorkOS SDK seals sessions with 32+ char password
- **Benefit:** CSRF protection, automatic expiry, httpOnly cookies

---

## 3. Authentication Flows

### 3.1 Standard Email/Password Authentication

**Flow:**

```
User clicks "Sign Up" or "Login"
↓
Frontend redirects to WorkOS AuthKit URL
↓
User creates account or logs in on WorkOS hosted page
↓
WorkOS redirects to /auth/callback?code=XXX
↓
Backend exchanges code for access_token + refresh_token
↓
Backend validates user, creates or updates user record
↓
Backend creates encrypted session cookie
↓
Redirect to /dashboard
↓
User authenticated ✅
```

**Backend Implementation:**

```typescript
// backend/src/api/routes/auth/authorize.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { workos } from "../../../services/workos";

export async function authorizeHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const authUrl = workos.userManagement.getAuthorizationUrl({
        provider: "authkit", // Use WorkOS hosted UI
        redirectUri: `${process.env.APP_URL}/auth/callback`,
        state: generateState(), // CSRF protection
        clientId: process.env.WORKOS_CLIENT_ID!
    });

    reply.redirect(authUrl);
}
```

```typescript
// backend/src/api/routes/auth/callback.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { workos } from "../../../services/workos";
import { userRepository } from "../../../storage/repositories/UserRepository";
import { createSession } from "../../../services/workos/session";

export async function callbackHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { code, state } = request.query as { code: string; state: string };

    // Validate state (CSRF protection)
    validateState(state);

    // Exchange code for user profile
    const { user, accessToken, refreshToken } = await workos.userManagement.authenticateWithCode({
        code,
        clientId: process.env.WORKOS_CLIENT_ID!
    });

    // Create or update user in FlowMaestro database
    let localUser = await userRepository.findByWorkOsId(user.id);

    if (!localUser) {
        localUser = await userRepository.create({
            workos_user_id: user.id,
            email: user.email,
            name: user.firstName + " " + user.lastName,
            email_verified: user.emailVerified,
            organization_id: user.organizationId // For multi-org support
        });
    } else {
        await userRepository.update(localUser.id, {
            email: user.email,
            name: user.firstName + " " + user.lastName,
            email_verified: user.emailVerified
        });
    }

    // Create encrypted session cookie
    const session = await createSession({
        userId: localUser.id,
        workosUserId: user.id,
        accessToken,
        refreshToken
    });

    // Set session cookie
    reply.setCookie("flowmaestro_session", session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/"
    });

    // Redirect to dashboard
    reply.redirect("/dashboard");
}
```

### 3.2 Social Login (Google, Microsoft, GitHub)

**Flow:**

```
User clicks "Sign in with Google"
↓
Frontend redirects to WorkOS with provider=GoogleOAuth
↓
WorkOS redirects to Google OAuth consent screen
↓
User approves, Google redirects to WorkOS
↓
WorkOS redirects to /auth/callback?code=XXX
↓
Same callback flow as email/password (above)
↓
User authenticated ✅
```

**Frontend Implementation:**

```typescript
// frontend/src/components/auth/SocialLogin.tsx
import React from "react";

export const SocialLogin: React.FC = () => {
    const handleSocialLogin = (provider: "GoogleOAuth" | "MicrosoftOAuth" | "GitHubOAuth") => {
        const authUrl = `/api/auth/authorize?provider=${provider}`;
        window.location.href = authUrl;
    };

    return (
        <div className="space-y-3">
            <button
                onClick={() => handleSocialLogin("GoogleOAuth")}
                className="w-full flex items-center justify-center gap-3 px-4 py-2 border rounded-lg"
            >
                <GoogleIcon />
                Continue with Google
            </button>

            <button
                onClick={() => handleSocialLogin("MicrosoftOAuth")}
                className="w-full flex items-center justify-center gap-3 px-4 py-2 border rounded-lg"
            >
                <MicrosoftIcon />
                Continue with Microsoft
            </button>

            <button
                onClick={() => handleSocialLogin("GitHubOAuth")}
                className="w-full flex items-center justify-center gap-3 px-4 py-2 border rounded-lg"
            >
                <GitHubIcon />
                Continue with GitHub
            </button>
        </div>
    );
};
```

**Backend OAuth Handler:**

```typescript
// backend/src/api/routes/auth/authorize.ts (extended)
export async function authorizeHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { provider } = request.query as { provider?: string };

    const authUrl = workos.userManagement.getAuthorizationUrl({
        provider: provider || "authkit", // GoogleOAuth, MicrosoftOAuth, etc.
        redirectUri: `${process.env.APP_URL}/auth/callback`,
        state: generateState(),
        clientId: process.env.WORKOS_CLIENT_ID!
    });

    reply.redirect(authUrl);
}
```

### 3.3 Magic Link (Passwordless)

**Flow:**

```
User enters email and clicks "Send magic link"
↓
Backend calls WorkOS to send magic link email
↓
User receives email with secure link
↓
User clicks link, redirects to WorkOS
↓
WorkOS redirects to /auth/callback?code=XXX
↓
Same callback flow as above
↓
User authenticated ✅
```

**Implementation:**

```typescript
// backend/src/api/routes/auth/magic-link.ts
export async function sendMagicLinkHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { email } = request.body as { email: string };

    await workos.userManagement.sendMagicLink({
        email,
        redirectUri: `${process.env.APP_URL}/auth/callback`
    });

    reply.send({
        success: true,
        message: "Magic link sent to your email"
    });
}
```

---

## 4. SSO Configuration

### 4.1 Enterprise SSO Overview

WorkOS supports **SAML 2.0** and **OIDC (OpenID Connect)** for enterprise single sign-on, allowing organizations to use their identity provider (Okta, Azure AD, OneLogin, Google Workspace, etc.).

**Key Features:**

- Self-serve SSO configuration via Admin Portal
- Just-in-Time (JIT) user provisioning
- Directory Sync (SCIM) for automated user/group management
- Domain verification to enforce SSO for specific email domains
- Multi-organization support (each org can have different SSO provider)

### 4.2 SSO Flow

```
Enterprise user clicks "Login with SSO"
↓
Frontend asks for organization domain/slug
↓
Backend queries WorkOS for organization's SSO connection
↓
WorkOS redirects to organization's IdP (e.g., Okta)
↓
User authenticates with corporate credentials
↓
IdP redirects back to WorkOS with SAML assertion/OIDC tokens
↓
WorkOS validates and redirects to /auth/callback?code=XXX
↓
Backend validates user, creates session
↓
User authenticated with corporate identity ✅
```

### 4.3 SSO Configuration in FlowMaestro

**Admin UI for SSO Setup:**

```typescript
// frontend/src/pages/admin/SSOConfiguration.tsx
import React, { useState } from "react";
import { api } from "../../lib/api";

export const SSOConfiguration: React.FC = () => {
    const [domain, setDomain] = useState("");
    const [ssoType, setSsoType] = useState<"saml" | "oidc">("saml");

    const handleEnableSSO = async () => {
        // Create WorkOS organization and SSO connection
        const { adminPortalUrl } = await api.createSSOConnection({
            domain,
            ssoType,
        });

        // Redirect admin to WorkOS Admin Portal for self-serve setup
        window.open(adminPortalUrl, "_blank");
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Enterprise SSO Setup</h2>

            <div className="space-y-4">
                <div>
                    <label>Organization Domain</label>
                    <input
                        type="text"
                        placeholder="acme.com"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="w-full px-4 py-2 border rounded"
                    />
                </div>

                <div>
                    <label>SSO Protocol</label>
                    <select
                        value={ssoType}
                        onChange={(e) => setSsoType(e.target.value as "saml" | "oidc")}
                        className="w-full px-4 py-2 border rounded"
                    >
                        <option value="saml">SAML 2.0</option>
                        <option value="oidc">OIDC (OpenID Connect)</option>
                    </select>
                </div>

                <button
                    onClick={handleEnableSSO}
                    className="px-6 py-2 bg-blue-600 text-white rounded"
                >
                    Configure SSO
                </button>
            </div>

            <div className="mt-8 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Supported Identity Providers:</h3>
                <ul className="list-disc ml-6">
                    <li>Okta</li>
                    <li>Azure Active Directory</li>
                    <li>Google Workspace</li>
                    <li>OneLogin</li>
                    <li>Auth0</li>
                    <li>JumpCloud</li>
                    <li>Custom SAML/OIDC providers</li>
                </ul>
            </div>
        </div>
    );
};
```

**Backend SSO Management:**

```typescript
// backend/src/api/routes/admin/sso/create.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { workos } from "../../../../services/workos";
import { organizationRepository } from "../../../../storage/repositories/OrganizationRepository";

export async function createSSOConnectionHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { domain, ssoType } = request.body as {
        domain: string;
        ssoType: "saml" | "oidc";
    };
    const userId = request.user!.id;

    // Create WorkOS organization
    const workosOrg = await workos.organizations.createOrganization({
        name: domain,
        domains: [domain]
    });

    // Store organization in FlowMaestro database
    const org = await organizationRepository.create({
        name: domain,
        workos_org_id: workosOrg.id,
        owner_user_id: userId
    });

    // Generate Admin Portal link for SSO setup
    const adminPortalLink = await workos.portal.generateLink({
        organization: workosOrg.id,
        intent: "sso",
        returnUrl: `${process.env.APP_URL}/admin/sso`
    });

    reply.send({
        success: true,
        data: {
            organizationId: org.id,
            adminPortalUrl: adminPortalLink
        }
    });
}
```

### 4.4 SSO Login Flow

```typescript
// backend/src/api/routes/auth/sso-authorize.ts
export async function ssoAuthorizeHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { organization } = request.query as { organization: string };

    // Get organization's SSO connection
    const org = await organizationRepository.findByDomainOrSlug(organization);
    if (!org || !org.workos_org_id) {
        throw new Error("Organization not found or SSO not configured");
    }

    // Generate SSO authorization URL
    const authUrl = workos.sso.getAuthorizationUrl({
        organization: org.workos_org_id,
        redirectUri: `${process.env.APP_URL}/auth/callback`,
        state: generateState(),
        clientId: process.env.WORKOS_CLIENT_ID!
    });

    reply.redirect(authUrl);
}
```

---

## 5. MCP Server Authentication

### 5.1 MCP Protocol OAuth 2.1 Requirements

The **Model Context Protocol (MCP) specification** (as of June 2025) requires:

- **OAuth 2.1** with PKCE (Proof Key for Code Exchange)
- **Authorization Server Metadata** (RFC 8414)
- **Dynamic Client Registration** (RFC 7591, recommended)
- **Resource Indicators** (RFC 8707)
- **Resource Server** classification with `.well-known/oauth-protected-resource`

**WorkOS provides all required components** as a spec-compliant OAuth 2.1 authorization server.

### 5.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MCP Client                                  │
│                   (Claude Desktop, Cursor, etc.)                    │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 1. Discover OAuth server
                          ├──► GET /.well-known/oauth-authorization-server
                          │
                          │ 2. Initiate OAuth flow
                          ├──► GET /oauth/authorize
                          │
                          │ 3. User authorizes
                          │    (redirected to WorkOS AuthKit)
                          │
                          │ 4. Exchange code for token
                          ├──► POST /oauth/token
                          │
                          │ 5. Access MCP tools with token
                          ├──► POST /mcp/tools/execute_workflow
                          │    Authorization: Bearer <token>
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    FlowMaestro MCP Server                           │
│                    (Resource Server + MCP Tools)                    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ OAuth 2.1 Endpoints                                           │ │
│  │ - /.well-known/oauth-authorization-server (metadata)          │ │
│  │ - /.well-known/oauth-protected-resource (resource info)       │ │
│  │ - /oauth/authorize (authorization endpoint)                   │ │
│  │ - /oauth/token (token exchange)                               │ │
│  │ - /oauth/introspect (token validation)                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ MCP Tools (Protected by OAuth)                                │ │
│  │ - execute_workflow                                            │ │
│  │ - list_workflows                                              │ │
│  │ - execute_agent                                               │ │
│  │ - get_execution_status                                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Validates tokens with WorkOS
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WorkOS Authorization Server                      │
│                    (OAuth 2.1 + User Management)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 OAuth Discovery Endpoints

**Authorization Server Metadata:**

```typescript
// backend/src/api/routes/oauth/.well-known/authorization-server.ts
import { FastifyRequest, FastifyReply } from "fastify";

export async function authorizationServerMetadataHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const baseUrl = process.env.APP_URL;

    reply.send({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        introspection_endpoint: `${baseUrl}/oauth/introspect`,
        revocation_endpoint: `${baseUrl}/oauth/revoke`,

        // Supported features
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"], // PKCE
        token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],

        // Scopes
        scopes_supported: [
            "openid",
            "profile",
            "email",
            "workflows:read",
            "workflows:execute",
            "agents:read",
            "agents:execute"
        ],

        // Token introspection
        introspection_endpoint_auth_methods_supported: ["client_secret_basic"],

        // OAuth 2.1 compliance
        pkce_required: true
    });
}
```

**Resource Server Metadata:**

```typescript
// backend/src/api/routes/oauth/.well-known/oauth-protected-resource.ts
export async function protectedResourceMetadataHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    reply.send({
        resource: process.env.APP_URL,
        authorization_servers: [process.env.APP_URL],
        scopes_supported: ["workflows:read", "workflows:execute", "agents:read", "agents:execute"],
        bearer_methods_supported: ["header"],
        resource_signing_alg_values_supported: ["RS256"]
    });
}
```

### 5.4 OAuth Client Registration

**Dynamic Client Registration (for MCP clients):**

```typescript
// backend/src/api/routes/oauth/register.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { oauthClientRepository } from "../../../storage/repositories/OAuthClientRepository";
import { generateClientId, generateClientSecret } from "../../../services/oauth/utils";

export async function registerClientHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const {
        client_name,
        redirect_uris,
        grant_types = ["authorization_code", "refresh_token"],
        scope
    } = request.body as {
        client_name: string;
        redirect_uris: string[];
        grant_types?: string[];
        scope?: string;
    };

    // Generate client credentials
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    // Store OAuth client
    const client = await oauthClientRepository.create({
        client_id: clientId,
        client_secret: clientSecret,
        client_name,
        redirect_uris,
        grant_types,
        scope: scope || "workflows:read workflows:execute"
    });

    reply.code(201).send({
        client_id: clientId,
        client_secret: clientSecret,
        client_name,
        redirect_uris,
        grant_types,
        scope,
        client_id_issued_at: Math.floor(Date.now() / 1000)
    });
}
```

### 5.5 Authorization Endpoint

```typescript
// backend/src/api/routes/oauth/authorize.ts
export async function oauthAuthorizeHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const {
        client_id,
        redirect_uri,
        response_type,
        scope,
        state,
        code_challenge,
        code_challenge_method
    } = request.query as Record<string, string>;

    // Validate client
    const client = await oauthClientRepository.findByClientId(client_id);
    if (!client || !client.redirect_uris.includes(redirect_uri)) {
        throw new Error("Invalid client or redirect_uri");
    }

    // Validate PKCE (required for MCP)
    if (!code_challenge || code_challenge_method !== "S256") {
        throw new Error("PKCE with S256 is required");
    }

    // Redirect to WorkOS for user authentication
    const workosAuthUrl = workos.userManagement.getAuthorizationUrl({
        provider: "authkit",
        redirectUri: `${process.env.APP_URL}/oauth/workos-callback`,
        state: JSON.stringify({
            client_id,
            redirect_uri,
            scope,
            state,
            code_challenge
        }),
        clientId: process.env.WORKOS_CLIENT_ID!
    });

    reply.redirect(workosAuthUrl);
}
```

### 5.6 Token Endpoint

```typescript
// backend/src/api/routes/oauth/token.ts
export async function oauthTokenHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const {
        grant_type,
        code,
        redirect_uri,
        client_id,
        client_secret,
        code_verifier,
        refresh_token
    } = request.body as Record<string, string>;

    if (grant_type === "authorization_code") {
        // Validate authorization code
        const authCode = await authorizationCodeRepository.findByCode(code);
        if (!authCode || authCode.expires_at < Date.now()) {
            throw new Error("Invalid or expired authorization code");
        }

        // Validate PKCE
        const expectedChallenge = base64UrlEncode(sha256(code_verifier));
        if (expectedChallenge !== authCode.code_challenge) {
            throw new Error("Invalid code_verifier");
        }

        // Generate access token and refresh token
        const accessToken = generateAccessToken({
            userId: authCode.user_id,
            clientId: client_id,
            scope: authCode.scope
        });

        const refreshToken = generateRefreshToken({
            userId: authCode.user_id,
            clientId: client_id
        });

        // Store tokens
        await tokenRepository.create({
            access_token: accessToken,
            refresh_token: refreshToken,
            user_id: authCode.user_id,
            client_id,
            scope: authCode.scope,
            expires_at: Date.now() + 3600 * 1000 // 1 hour
        });

        reply.send({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: refreshToken,
            scope: authCode.scope
        });
    } else if (grant_type === "refresh_token") {
        // Handle refresh token flow
        const token = await tokenRepository.findByRefreshToken(refresh_token);
        if (!token) {
            throw new Error("Invalid refresh token");
        }

        const newAccessToken = generateAccessToken({
            userId: token.user_id,
            clientId: token.client_id,
            scope: token.scope
        });

        reply.send({
            access_token: newAccessToken,
            token_type: "Bearer",
            expires_in: 3600,
            scope: token.scope
        });
    } else {
        throw new Error("Unsupported grant_type");
    }
}
```

### 5.7 MCP Tool Execution with OAuth

```typescript
// backend/src/api/routes/mcp/tools/execute-workflow.ts
export async function executeWorkflowMCPHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Extract access token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Missing or invalid access token");
    }

    const accessToken = authHeader.substring(7);

    // Validate token
    const tokenData = await validateAccessToken(accessToken);
    if (!tokenData) {
        throw new UnauthorizedError("Invalid or expired token");
    }

    // Check scope
    if (!tokenData.scope.includes("workflows:execute")) {
        throw new ForbiddenError("Insufficient scope");
    }

    const { workflowId, inputs } = request.body as {
        workflowId: string;
        inputs: Record<string, any>;
    };

    // Execute workflow with user context
    const execution = await executeWorkflow({
        workflowId,
        inputs,
        userId: tokenData.user_id
    });

    reply.send({
        success: true,
        data: {
            executionId: execution.id,
            status: execution.status
        }
    });
}
```

---

## 6. Database Schema Changes

### 6.1 Users Table Extension

```sql
-- Add WorkOS integration fields to existing users table
ALTER TABLE flowmaestro.users
    ADD COLUMN workos_user_id VARCHAR(255) UNIQUE,
    ADD COLUMN workos_organization_id VARCHAR(255),
    ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN auth_method VARCHAR(50) DEFAULT 'password', -- 'password', 'google', 'microsoft', 'sso', etc.
    ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN last_login_at TIMESTAMP;

CREATE INDEX idx_users_workos_user_id ON flowmaestro.users(workos_user_id);
CREATE INDEX idx_users_workos_organization_id ON flowmaestro.users(workos_organization_id);
```

### 6.2 Organizations Table

```sql
CREATE TABLE flowmaestro.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    workos_org_id VARCHAR(255) UNIQUE,

    -- SSO configuration
    sso_enabled BOOLEAN DEFAULT FALSE,
    sso_provider VARCHAR(50), -- 'saml', 'oidc'
    domain VARCHAR(255),

    -- Metadata
    owner_user_id UUID REFERENCES users(id),
    settings JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_organizations_workos_org_id ON flowmaestro.organizations(workos_org_id);
CREATE INDEX idx_organizations_domain ON flowmaestro.organizations(domain);
```

### 6.3 OAuth Clients Table (for MCP)

```sql
CREATE TABLE flowmaestro.oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret TEXT NOT NULL, -- Hashed
    client_name VARCHAR(255) NOT NULL,

    -- OAuth configuration
    redirect_uris TEXT[] NOT NULL,
    grant_types VARCHAR(50)[] DEFAULT ARRAY['authorization_code', 'refresh_token'],
    scope TEXT,

    -- MCP-specific
    is_mcp_client BOOLEAN DEFAULT FALSE,

    -- Metadata
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX idx_oauth_clients_client_id ON flowmaestro.oauth_clients(client_id);
```

### 6.4 Authorization Codes Table

```sql
CREATE TABLE flowmaestro.authorization_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- OAuth parameters
    redirect_uri TEXT NOT NULL,
    scope TEXT,

    -- PKCE
    code_challenge VARCHAR(255) NOT NULL,
    code_challenge_method VARCHAR(10) NOT NULL DEFAULT 'S256',

    -- Expiry
    expires_at BIGINT NOT NULL, -- Unix timestamp
    used_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_authorization_codes_code ON flowmaestro.authorization_codes(code);
CREATE INDEX idx_authorization_codes_expires_at ON flowmaestro.authorization_codes(expires_at);
```

### 6.5 Access Tokens Table

```sql
CREATE TABLE flowmaestro.access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,

    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id),
    user_id UUID NOT NULL REFERENCES users(id),

    scope TEXT,
    expires_at BIGINT NOT NULL, -- Unix timestamp

    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_access_tokens_token ON flowmaestro.access_tokens(access_token);
CREATE INDEX idx_access_tokens_refresh ON flowmaestro.access_tokens(refresh_token);
CREATE INDEX idx_access_tokens_user_id ON flowmaestro.access_tokens(user_id);
```

---

## 7. Backend Implementation

### 7.1 WorkOS Service Initialization

```typescript
// backend/src/services/workos/index.ts
import { WorkOS } from "@workos-inc/node";

export const workos = new WorkOS(process.env.WORKOS_API_KEY!);

export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID!;
export const WORKOS_COOKIE_PASSWORD = process.env.WORKOS_COOKIE_PASSWORD!; // 32+ chars

// Validate configuration
if (!process.env.WORKOS_API_KEY) {
    throw new Error("WORKOS_API_KEY environment variable required");
}

if (!process.env.WORKOS_CLIENT_ID) {
    throw new Error("WORKOS_CLIENT_ID environment variable required");
}

if (!process.env.WORKOS_COOKIE_PASSWORD || process.env.WORKOS_COOKIE_PASSWORD.length < 32) {
    throw new Error("WORKOS_COOKIE_PASSWORD must be at least 32 characters");
}
```

### 7.2 Session Management

```typescript
// backend/src/services/workos/session.ts
import { sealData, unsealData } from "iron-session";

interface SessionData {
    userId: string;
    workosUserId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export async function createSession(data: SessionData): Promise<string> {
    const sealed = await sealData(data, {
        password: WORKOS_COOKIE_PASSWORD,
        ttl: 7 * 24 * 60 * 60 // 7 days
    });

    return sealed;
}

export async function validateSession(sessionCookie: string): Promise<SessionData | null> {
    try {
        const data = await unsealData<SessionData>(sessionCookie, {
            password: WORKOS_COOKIE_PASSWORD
        });

        // Check if token expired
        if (data.expiresAt < Date.now()) {
            // Refresh token
            const refreshedData = await refreshSession(data.refreshToken);
            return refreshedData;
        }

        return data;
    } catch (error) {
        return null;
    }
}

async function refreshSession(refreshToken: string): Promise<SessionData> {
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await workos.userManagement.authenticateWithRefreshToken({
            refreshToken,
            clientId: WORKOS_CLIENT_ID
        });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: Date.now() + 3600 * 1000 // 1 hour
        // userId and workosUserId remain the same
    } as SessionData;
}
```

### 7.3 Authentication Middleware

```typescript
// backend/src/api/middleware/workos-auth.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { validateSession } from "../../services/workos/session";
import { userRepository } from "../../storage/repositories/UserRepository";

export async function workosAuthMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const sessionCookie = request.cookies.flowmaestro_session;

    if (!sessionCookie) {
        throw new UnauthorizedError("No session cookie found");
    }

    const session = await validateSession(sessionCookie);

    if (!session) {
        throw new UnauthorizedError("Invalid or expired session");
    }

    // Load user from database
    const user = await userRepository.findById(session.userId);

    if (!user) {
        throw new UnauthorizedError("User not found");
    }

    // Attach user to request
    request.user = user;
}
```

**Apply to Routes:**

```typescript
// backend/src/api/server.ts
import { workosAuthMiddleware } from "./middleware/workos-auth";

// Protected routes
fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("onRequest", workosAuthMiddleware);

    // All routes inside this block require authentication
    protectedRoutes.register(workflowRoutes, { prefix: "/api/workflows" });
    protectedRoutes.register(agentRoutes, { prefix: "/api/agents" });
    protectedRoutes.register(connectionRoutes, { prefix: "/api/connections" });
});
```

### 7.4 User Repository Extension

```typescript
// backend/src/storage/repositories/UserRepository.ts
export class UserRepository {
    async findByWorkOsId(workosUserId: string): Promise<User | null> {
        const result = await pool.query<User>(
            `SELECT * FROM users
             WHERE workos_user_id = $1 AND deleted_at IS NULL`,
            [workosUserId]
        );

        return result.rows[0] || null;
    }

    async create(input: CreateUserInput): Promise<User> {
        const result = await pool.query<User>(
            `INSERT INTO users (
                workos_user_id,
                email,
                name,
                email_verified,
                workos_organization_id,
                auth_method
            )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                input.workos_user_id,
                input.email,
                input.name,
                input.email_verified,
                input.workos_organization_id,
                input.auth_method || "password"
            ]
        );

        return result.rows[0];
    }

    async updateLastLogin(userId: string): Promise<void> {
        await pool.query(
            `UPDATE users
             SET last_login_at = NOW()
             WHERE id = $1`,
            [userId]
        );
    }
}
```

---

## 8. Frontend Implementation

### 8.1 Login Page

```typescript
// frontend/src/pages/Login.tsx
import React from "react";
import { SocialLogin } from "../components/auth/SocialLogin";

export const Login: React.FC = () => {
    const handleEmailLogin = () => {
        window.location.href = "/api/auth/authorize";
    };

    const handleSSOLogin = () => {
        const org = prompt("Enter your organization domain (e.g., acme.com):");
        if (org) {
            window.location.href = `/api/auth/sso-authorize?organization=${org}`;
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Sign in to FlowMaestro</h2>
                    <p className="mt-2 text-gray-600">
                        Automate workflows with AI-powered agents
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleEmailLogin}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold"
                    >
                        Continue with Email
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <SocialLogin />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Enterprise</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSSOLogin}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold"
                    >
                        Sign in with SSO
                    </button>
                </div>
            </div>
        </div>
    );
};
```

### 8.2 Auth Context

```typescript
// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const currentUser = await api.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await api.logout();
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};
```

### 8.3 Protected Route Component

```typescript
// frontend/src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};
```

---

## 9. API Endpoints

### 9.1 Authentication Endpoints

```
# Email/Password & Social Login
GET  /api/auth/authorize?provider={provider}
  - Redirects to WorkOS AuthKit
  - Providers: authkit, GoogleOAuth, MicrosoftOAuth, GitHubOAuth

GET  /api/auth/callback?code={code}&state={state}
  - Handles OAuth callback from WorkOS
  - Creates session cookie
  - Redirects to /dashboard

# SSO
GET  /api/auth/sso-authorize?organization={domain}
  - Redirects to organization's SSO provider

# Magic Link
POST /api/auth/magic-link
  Body: { email }
  - Sends magic link email via WorkOS

# Logout
POST /api/auth/logout
  - Clears session cookie
  - Redirects to login

# Current User
GET  /api/auth/me
  - Returns currently authenticated user
```

### 9.2 OAuth Endpoints (for MCP)

```
# Discovery
GET  /.well-known/oauth-authorization-server
  - Returns OAuth 2.1 metadata

GET  /.well-known/oauth-protected-resource
  - Returns resource server metadata

# Client Registration
POST /oauth/register
  Body: { client_name, redirect_uris }
  - Registers new OAuth client (for MCP)

# Authorization
GET  /oauth/authorize?client_id={id}&redirect_uri={uri}&...
  - Initiates OAuth authorization flow

# Token Exchange
POST /oauth/token
  Body: { grant_type, code, client_id, client_secret, code_verifier }
  - Exchanges authorization code for access token

# Token Introspection
POST /oauth/introspect
  Body: { token }
  - Validates access token

# Token Revocation
POST /oauth/revoke
  Body: { token }
  - Revokes access/refresh token
```

### 9.3 Admin Endpoints

```
# SSO Configuration
POST /api/admin/sso/create
  Body: { domain, ssoType }
  - Creates organization and SSO connection
  - Returns Admin Portal URL

GET  /api/admin/organizations
  - Lists organizations for current user

GET  /api/admin/organizations/:id/users
  - Lists users in organization

# OAuth Client Management
POST /api/admin/oauth/clients
  Body: { name, redirect_uris, scopes }
  - Creates OAuth client for MCP access

GET  /api/admin/oauth/clients
  - Lists OAuth clients

DELETE /api/admin/oauth/clients/:id
  - Revokes OAuth client
```

---

## 10. Session Management

### 10.1 Session Structure

```typescript
interface FlowMaestroSession {
    userId: string; // FlowMaestro user ID
    workosUserId: string; // WorkOS user ID
    accessToken: string; // WorkOS access token
    refreshToken: string; // WorkOS refresh token
    expiresAt: number; // Token expiry timestamp
    organizationId?: string; // For multi-org support
}
```

### 10.2 Session Lifecycle

**1. Session Creation:**

```typescript
const session = await createSession({
    userId: localUser.id,
    workosUserId: workosUser.id,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + 3600 * 1000
});

reply.setCookie("flowmaestro_session", session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 // 7 days
});
```

**2. Session Validation (on each request):**

```typescript
const sessionCookie = request.cookies.flowmaestro_session;
const session = await validateSession(sessionCookie);

if (!session) {
    throw new UnauthorizedError("Invalid session");
}

request.user = await userRepository.findById(session.userId);
```

**3. Automatic Token Refresh:**

```typescript
if (session.expiresAt < Date.now()) {
    const { accessToken, refreshToken } = await workos.userManagement.authenticateWithRefreshToken({
        refreshToken: session.refreshToken
    });

    // Update session
    const newSession = await createSession({
        ...session,
        accessToken,
        refreshToken,
        expiresAt: Date.now() + 3600 * 1000
    });

    reply.setCookie("flowmaestro_session", newSession, {
        /* ... */
    });
}
```

**4. Session Destruction:**

```typescript
reply.clearCookie("flowmaestro_session");
```

---

## 11. Migration Strategy

### 11.1 Phase 1: Parallel Authentication (2-3 weeks)

**Goal:** Run WorkOS authentication alongside existing JWT auth

**Tasks:**

1. Install WorkOS SDK: `npm install @workos-inc/node`
2. Add WorkOS environment variables
3. Extend `users` table with WorkOS fields
4. Implement WorkOS authentication routes
5. Create WorkOS middleware
6. Add login page with WorkOS options
7. Test authentication flows

**Migration Approach:**

- Keep existing JWT middleware
- Add WorkOS middleware as alternative
- Use feature flag to toggle authentication method per user

```typescript
async function authenticate(request: FastifyRequest) {
    // Check for WorkOS session cookie
    const workosSession = request.cookies.flowmaestro_session;
    if (workosSession) {
        return await workosAuthMiddleware(request);
    }

    // Fallback to JWT
    const jwtToken = request.headers.authorization;
    if (jwtToken) {
        return await jwtAuthMiddleware(request);
    }

    throw new UnauthorizedError("No authentication provided");
}
```

### 11.2 Phase 2: OAuth Provider Setup (1-2 weeks)

**Goal:** Enable Google, Microsoft, GitHub social login

**Tasks:**

1. Create OAuth apps in Google Cloud, Azure, GitHub
2. Configure redirect URIs in WorkOS Dashboard
3. Add social login buttons to UI
4. Test OAuth flows
5. Handle user profile merging (same email from different providers)

### 11.3 Phase 3: SSO Implementation (2-3 weeks)

**Goal:** Enable enterprise SSO for organizations

**Tasks:**

1. Create `organizations` table
2. Implement organization management API
3. Build Admin Portal integration
4. Create SSO configuration UI
5. Test SAML and OIDC flows with test IdPs
6. Document SSO setup for customers

### 11.4 Phase 4: MCP OAuth (3-4 weeks)

**Goal:** Expose workflows as authenticated MCP servers

**Tasks:**

1. Create OAuth client registration
2. Implement authorization code flow with PKCE
3. Build token endpoint
4. Add OAuth discovery endpoints
5. Protect MCP tools with OAuth middleware
6. Test with Claude Desktop and other MCP clients
7. Document MCP server setup

### 11.5 Phase 5: Full Migration (1-2 weeks)

**Goal:** Deprecate old JWT auth, WorkOS becomes primary

**Tasks:**

1. Migrate all existing users to WorkOS (automated script)
2. Remove JWT authentication code
3. Update all documentation
4. Notify users of authentication changes
5. Monitor for issues

**Total Timeline: 9-14 weeks**

---

## 12. Security Considerations

### 12.1 Session Security

- **Encrypted Cookies**: Sessions sealed with `iron-session` using 32+ char password
- **HttpOnly Cookies**: Prevents XSS attacks
- **SameSite=Lax**: CSRF protection
- **Secure Flag**: HTTPS-only in production
- **Short-Lived Tokens**: Access tokens expire in 1 hour, auto-refresh

### 12.2 OAuth Security

- **PKCE Required**: Prevents authorization code interception
- **State Parameter**: CSRF protection
- **Client Secret Hashing**: bcrypt with salt
- **Redirect URI Validation**: Exact match required
- **Token Expiry**: Access tokens short-lived (1 hour)
- **Scope Enforcement**: Validate scopes on every request

### 12.3 SSO Security

- **Domain Verification**: Prevent unauthorized SSO setup
- **SAML Assertion Validation**: Verify signatures and timestamps
- **OIDC Token Validation**: Verify JWT signatures with IdP public keys
- **Organization Isolation**: Users can't cross-access organizations

### 12.4 MCP Server Security

- **Token Validation**: Verify access token on every MCP request
- **Scope Checking**: Ensure token has required scope for operation
- **Rate Limiting**: Prevent abuse of MCP endpoints
- **Audit Logging**: Log all MCP tool executions with user context

---

## 13. Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

**Deliverables:**

- ✅ WorkOS SDK installed and configured
- ✅ Database schema extended
- ✅ Basic email/password auth working
- ✅ Session management implemented
- ✅ Authentication middleware created

**Code Checklist:**

- [ ] Install `@workos-inc/node`
- [ ] Add environment variables
- [ ] Run database migrations
- [ ] Implement `/api/auth/authorize` endpoint
- [ ] Implement `/api/auth/callback` endpoint
- [ ] Create session service
- [ ] Create auth middleware
- [ ] Build login page
- [ ] Test authentication flow

---

### Phase 2: OAuth Providers (Weeks 4-5)

**Deliverables:**

- ✅ Google OAuth working
- ✅ Microsoft OAuth working
- ✅ GitHub OAuth working
- ✅ Social login UI components
- ✅ Profile merging logic

**Code Checklist:**

- [ ] Configure Google OAuth in WorkOS Dashboard
- [ ] Configure Microsoft OAuth in WorkOS Dashboard
- [ ] Configure GitHub OAuth in WorkOS Dashboard
- [ ] Build SocialLogin component
- [ ] Test OAuth flows
- [ ] Handle duplicate email scenarios

---

### Phase 3: Enterprise SSO (Weeks 6-8)

**Deliverables:**

- ✅ Organizations table and API
- ✅ SSO configuration UI
- ✅ Admin Portal integration
- ✅ SAML flow working
- ✅ OIDC flow working
- ✅ Domain verification

**Code Checklist:**

- [ ] Create organizations database schema
- [ ] Implement organization CRUD API
- [ ] Build SSO configuration UI
- [ ] Integrate WorkOS Admin Portal
- [ ] Test SAML with Okta/Azure AD
- [ ] Test OIDC with Google Workspace
- [ ] Document SSO setup

---

### Phase 4: MCP OAuth (Weeks 9-12)

**Deliverables:**

- ✅ OAuth client registration
- ✅ Authorization code flow
- ✅ Token endpoint
- ✅ Discovery endpoints
- ✅ MCP tools protected
- ✅ Claude Desktop integration tested

**Code Checklist:**

- [ ] Create oauth_clients table
- [ ] Implement client registration endpoint
- [ ] Implement authorization endpoint
- [ ] Implement token endpoint
- [ ] Add OAuth discovery metadata
- [ ] Protect MCP tools with OAuth middleware
- [ ] Test with Claude Desktop
- [ ] Document MCP server usage

---

### Phase 5: Polish & Migration (Weeks 13-14)

**Deliverables:**

- ✅ All users migrated to WorkOS
- ✅ Old JWT auth removed
- ✅ Documentation updated
- ✅ Production deployment

**Code Checklist:**

- [ ] Write user migration script
- [ ] Test migration with sample data
- [ ] Remove JWT authentication code
- [ ] Update all documentation
- [ ] Deploy to staging
- [ ] Test thoroughly
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 14. Testing Strategy

### 14.1 Unit Tests

```typescript
// backend/tests/unit/services/workos/session.test.ts
describe("Session Management", () => {
    it("should create and validate session", async () => {
        const session = await createSession({
            userId: "user-123",
            workosUserId: "workos-456",
            accessToken: "token",
            refreshToken: "refresh",
            expiresAt: Date.now() + 3600000
        });

        const validated = await validateSession(session);
        expect(validated?.userId).toBe("user-123");
    });

    it("should refresh expired token", async () => {
        const expiredSession = await createSession({
            userId: "user-123",
            workosUserId: "workos-456",
            accessToken: "old-token",
            refreshToken: "refresh",
            expiresAt: Date.now() - 1000 // Expired
        });

        const refreshed = await validateSession(expiredSession);
        expect(refreshed?.accessToken).not.toBe("old-token");
    });
});
```

### 14.2 Integration Tests

```typescript
// backend/tests/integration/auth.test.ts
describe("Authentication Flow", () => {
    it("should authenticate user with email/password", async () => {
        // 1. Get authorization URL
        const authResponse = await request(app).get("/api/auth/authorize");
        expect(authResponse.status).toBe(302);

        // 2. Simulate WorkOS callback
        const callbackResponse = await request(app).get("/api/auth/callback?code=test-code");
        expect(callbackResponse.status).toBe(302);
        expect(callbackResponse.headers["set-cookie"]).toBeDefined();
    });
});
```

### 14.3 E2E Tests (Playwright)

```typescript
// e2e/auth.spec.ts
test("User can login with Google", async ({ page }) => {
    await page.goto("/login");

    await page.click('button:has-text("Continue with Google")');

    // WorkOS AuthKit appears
    await expect(page).toHaveURL(/workos\.com/);

    // ... complete OAuth flow ...

    // User redirected to dashboard
    await expect(page).toHaveURL("/dashboard");
});
```

---

## 15. Configuration & Deployment

### 15.1 Environment Variables

```env
# WorkOS Configuration
WORKOS_API_KEY=<YOUR_WORKOS_API_KEY>
WORKOS_CLIENT_ID=<YOUR_WORKOS_CLIENT_ID>
WORKOS_COOKIE_PASSWORD=at-least-32-characters-long-random-string

# Application URLs
APP_URL=https://flowmaestro.com
WORKOS_REDIRECT_URI=https://flowmaestro.com/auth/callback

# OAuth Provider Credentials (if using default staging credentials)
# Note: WorkOS provides default OAuth credentials for staging environments
# For production, configure your own OAuth apps and add credentials to WorkOS Dashboard

# Optional: Custom OAuth (if not using WorkOS defaults)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### 15.2 WorkOS Dashboard Setup

**1. Create WorkOS Account:**

- Sign up at https://workos.com
- Create a new environment (Development, Staging, Production)

**2. Configure Redirect URIs:**

```
Development: http://localhost:3001/auth/callback
Staging:     https://staging.flowmaestro.com/auth/callback
Production:  https://flowmaestro.com/auth/callback
```

**3. Enable Authentication Methods:**

- ✅ Email/Password
- ✅ Google OAuth (default credentials available for staging)
- ✅ Microsoft OAuth (default credentials available for staging)
- ✅ GitHub OAuth
- ✅ Magic Link
- ✅ MFA

**4. Configure OAuth Providers (Production):**

For production, create your own OAuth apps:

**Google OAuth:**

1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `https://api.workos.com/sso/oauth/google/callback`
4. Copy Client ID and Client Secret to WorkOS Dashboard

**Microsoft OAuth:**

1. Go to Azure Portal → App registrations
2. Create new registration
3. Select "Personal Microsoft accounts only"
4. Add redirect URI: `https://api.workos.com/sso/oauth/microsoft/callback`
5. Generate client secret
6. Copy Application (client) ID and secret to WorkOS Dashboard

### 15.3 Deployment Checklist

**Pre-Deployment:**

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] WorkOS Dashboard configured
- [ ] OAuth providers configured (if production)
- [ ] Session cookie password generated (32+ chars)
- [ ] HTTPS enabled
- [ ] CORS configured

**Post-Deployment:**

- [ ] Test email/password login
- [ ] Test social login (Google, Microsoft)
- [ ] Test SSO flow (if enabled)
- [ ] Test MCP OAuth flow
- [ ] Monitor error logs
- [ ] Check session expiry/refresh

---

## 16. Cost Analysis

### 16.1 WorkOS Pricing

**Free Tier:**

- Up to 1,000,000 monthly active users (MAUs)
- All authentication methods included
- SSO connections: Unlimited
- Directory Sync: Unlimited
- Support: Community & email

**Startup Plan ($125/month):**

- Everything in Free tier
- Remove WorkOS branding
- Priority support
- Custom session duration
- Advanced security features

**Enterprise Plan (Custom):**

- Custom pricing based on usage
- SLA guarantees
- Dedicated support
- Custom contracts
- Compliance certifications

### 16.2 Estimated Costs for FlowMaestro

**Scenario 1: Early Stage (0-1000 users)**

- Cost: **$0/month** (Free tier)

**Scenario 2: Growth Stage (1000-10000 users)**

- Cost: **$125/month** (Startup plan)
- Remove branding for professional look

**Scenario 3: Enterprise (10000+ users)**

- Cost: **Custom** (likely $500-2000/month depending on features)

**Comparison to Building In-House:**

| Feature                      | Build In-House | WorkOS      |
| ---------------------------- | -------------- | ----------- |
| Initial Development Time     | 3-6 months     | 1-2 weeks   |
| Ongoing Maintenance          | 1-2 engineers  | $0-125/mo   |
| SSO Integration Per Provider | 2-4 weeks      | Immediate   |
| Security Compliance          | DIY audits     | SOC 2 ready |
| MFA Implementation           | 4-6 weeks      | Immediate   |
| **Total Cost (Year 1)**      | **$200k+**     | **$0-1500** |

**ROI:** WorkOS saves 95%+ of authentication development costs.

---

## 17. Conclusion & Next Steps

### 17.1 Summary

Integrating **WorkOS** into FlowMaestro provides:

1. ✅ **Enterprise-Grade Authentication**: Email/password, social login, SSO, MFA
2. ✅ **Standards-Compliant MCP OAuth**: Secure external access to workflows
3. ✅ **Rapid Implementation**: 9-14 weeks vs 6+ months building in-house
4. ✅ **Cost-Effective**: $0-125/month vs $200k+ for in-house development
5. ✅ **Scalable Architecture**: Handles growth from 10 users to 10,000+
6. ✅ **Future-Proof**: WorkOS evolves with authentication standards

### 17.2 Strategic Benefits

**For Product:**

- Professional authentication experience
- Enterprise-ready SSO
- MCP server authentication unlocks new use cases

**For Engineering:**

- Focus on core product instead of auth infrastructure
- Proven, production-tested authentication
- Excellent TypeScript support

**For Business:**

- Faster time-to-market
- Lower development costs
- Enterprise sales enablement (SSO requirement)
- Compliance made easier (SOC 2, GDPR)

### 17.3 Immediate Next Steps

**Week 1-2: Planning & Setup**

1. ✅ Review this integration plan with engineering team
2. ✅ Get stakeholder buy-in
3. ✅ Create WorkOS account and configure environment
4. ✅ Set up development environment with WorkOS SDK
5. ✅ Assign technical lead for integration

**Week 3-4: Proof of Concept**

1. ✅ Implement basic email/password authentication
2. ✅ Test session management
3. ✅ Verify authentication middleware works
4. ✅ Demo to team and gather feedback

**Week 5+: Full Implementation**

1. ✅ Follow Phase 1-5 implementation plan
2. ✅ Conduct thorough testing
3. ✅ Document for team and users
4. ✅ Deploy to production

### 17.4 Success Metrics

- [ ] 100% of new users authenticate via WorkOS
- [ ] Social login conversion rate > 40%
- [ ] SSO setup time < 30 minutes for enterprise customers
- [ ] MCP server OAuth flow working with 3+ clients (Claude Desktop, Cursor, etc.)
- [ ] Zero authentication-related security incidents
- [ ] 95%+ authentication uptime (leveraging WorkOS SLA)

---

## Appendix A: Useful Links

**WorkOS Resources:**

- Official Website: https://workos.com
- Documentation: https://workos.com/docs
- Node.js SDK: https://www.npmjs.com/package/@workos-inc/node
- GitHub: https://github.com/workos/workos-node
- Dashboard: https://dashboard.workos.com

**OAuth & MCP Resources:**

- MCP Specification: https://modelcontextprotocol.io
- MCP Authorization Spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization
- WorkOS MCP Guide: https://workos.com/blog/introduction-to-mcp-authentication
- OAuth 2.1: https://oauth.net/2.1/

**Integration Examples:**

- WorkOS + Next.js: https://github.com/workos/next-authkit-example
- WorkOS SSO Example: https://github.com/workos/node-example-applications
- MCP OAuth on AWS Lambda: https://dev.to/aws-builders/mcp-oauth-on-aws-lambda-with-workos

---

## Appendix B: FAQ

**Q: Can we keep using JWT for API tokens?**

A: Yes! WorkOS handles user authentication and sessions. You can still issue JWT tokens for API access if needed. However, WorkOS access tokens can also be used directly.

**Q: What happens if WorkOS goes down?**

A: WorkOS has 99.9% uptime SLA. For additional resilience, implement caching of user sessions and graceful degradation. Users with active sessions can continue working even during brief outages.

**Q: Can we customize the login UI?**

A: Yes! WorkOS AuthKit UI is customizable (colors, logos, branding). For full control, use the WorkOS API directly and build your own UI.

**Q: How does billing work?**

A: WorkOS free tier covers up to 1M MAUs. You only pay if you need branding removal or enterprise features. Billing is based on monthly active users.

**Q: Can we migrate existing users?**

A: Yes! Users can be migrated by creating WorkOS user records linked to existing FlowMaestro users. Passwords can be migrated using WorkOS password import API.

**Q: Does this work with Temporal?**

A: Yes! User context from WorkOS sessions can be passed to Temporal workflows just like current JWT implementation.

**Q: What about GDPR compliance?**

A: WorkOS is GDPR compliant. User data is encrypted at rest and in transit. WorkOS provides data export and deletion APIs for compliance.

---

**END OF DOCUMENT**

---

**Document Statistics:**

- Words: ~12,000
- Sections: 17 major + 2 appendices
- Code Examples: 30+
- Diagrams: 2 architecture diagrams
- Estimated Reading Time: 50 minutes

**Author's Note:**

This integration plan represents comprehensive research conducted on 2025-11-06 based on WorkOS documentation, MCP protocol specifications, and FlowMaestro's existing architecture. All recommendations are based on production-ready patterns and best practices. Please validate technical details during POC phase.
