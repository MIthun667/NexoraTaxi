# Production security limitations

## Authentication rate limiting

The API currently rate-limits `/auth/login` and `/auth/refresh` with an in-memory, per-process limiter.

This protects a single API process, but it is **not a distributed rate limiter**. In a deployment with multiple API replicas, each replica maintains an independent counter. Production multi-instance deployments must therefore enforce an additional distributed or edge rate limit (for example at the ingress/API gateway or through a shared Redis-backed limiter) before relying on the limit as a global control.

The API emits a production warning at startup when this process-local limiter is active so the limitation is not silent.

A Redis-backed limiter is intentionally deferred from the P0 security phase to avoid introducing a partial Redis/job-system architecture.

## Refresh-token sessions

Access and refresh tokens use separate secrets and explicit token-purpose claims. Refresh requests re-resolve the current user and RBAC state, so deleted, suspended, deactivated, or locked users cannot continue refreshing sessions.

Persistent refresh-token rotation, reuse detection, server-side session revocation, and per-device session management remain a future session-management migration.
