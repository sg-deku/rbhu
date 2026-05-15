# Authentication Documentation

## Overview

rbhu provides a secure authentication system based on JSON Web Tokens (JWT) for API access, alongside OAuth 2.0 integrations for third-party providers (Google, GitHub).

## Token Authentication (JWT)

Most endpoints require a valid JWT token. 

### Obtaining a Token
- **POST `/api/auth/login`**: Authenticate via email and password.
- **POST `/api/auth/register`**: Register a new user and receive a token.
- **OAuth Callback**: Successfully authenticating via Google or GitHub will redirect the user with a token appended to the URL.

### Using the Token
Pass the token in the `Authorization` header of your HTTP requests:
```http
Authorization: Bearer <your_jwt_token_here>
```

### Expiration and Security
- Tokens expire in 7 days by default (configurable via `JWT_EXPIRES_IN`).
- All JWT tokens are signed using HMAC SHA-256 with the secret configured in `JWT_SECRET`.

## Role-Based Access Control (RBAC)

rbhu implements RBAC with the following roles:
- `USER`: Base access level, can interact with standard search endpoints.
- `MODERATOR`: Can moderate user-generated content and manage select settings.
- `ADMIN`: Full access to user management, integration configurations, and vector index tools.
- `SUPERADMIN`: Highest level access, unrestricted.

### Permissions
Endpoints are guarded by middleware:
- `authMiddleware`: Verifies token validity and user existence.
- `requireRole(...)`: Validates that the current user matches the required roles.

## OAuth Providers

For OAuth logins:
- **Google**: `GET /api/oauth/google`
- **GitHub**: `GET /api/oauth/github`

The application uses `passport.js` internally. Once the provider authorizes the user, a JWT is minted and returned to the client application.