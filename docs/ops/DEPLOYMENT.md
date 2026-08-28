# Operations & Deployment Guide

This guide covers the requirements and procedures for deploying the AI Company Operating System to staging and production environments.

## 1. Deployment Architecture

The platform is designed to run as a set of containerized services:
- **API**: NestJS application (Node.js)
- **Web**: Next.js application (App Router)
- **Worker**: Background task processing (Optional based on agent load)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (Optional for performance scaling)

## 2. Containerization

Dockerfiles for each service are located in the `/docker` directory:
- `docker/Dockerfile.api`
- `docker/Dockerfile.web`
- `docker/Dockerfile.worker`

### Build Example
```bash
docker build -t nexora-api -f docker/Dockerfile.api .
docker build -t nexora-web -f docker/Dockerfile.web .
```

## 3. Environment Specifications

Production environments must provide the following configuration keys (see `infra/env/*.example` for templates):

### Core API
- `DATABASE_URL`: Connection string for PostgreSQL.
- `JWT_SECRET`: HS256 secret for authentication tokens.
- `PORT`: Service binding port (default 3000).

### Frontend (Web)
- `NEXT_PUBLIC_API_URL`: Public endpoint for the API service.
- `NEXT_AUTH_SECRET`: Secret for client-side session management.

### AI Runtime
- `OLLAMA_HOST` / `OPENAI_API_KEY`: Connection details for the AI inference provider.

## 4. Kubernetes Deployment

Base Kubernetes manifests are provided in the `/k8s/base` directory. These manifests define:
- **Deployments**: Scaling and update strategies for API, Web, and Workers.
- **Services**: Internal networking and service discovery.
- **Ingress**: External access and TLS termination logic.

To apply base configurations:
```bash
kubectl apply -k k8s/base
```

## 5. Security Posture

- **Secrets Management**: Never commit actual secrets. Use a KMS (Key Management Service) or Kubernetes Secrets.
- **Rate Limiting**: Production API instances should be configured with rate limiting via the load balancer or Ingress controller.
- **Data Isolation**: Multi-tenant data is logically isolated via `organizationId` keys across all primary schemas.
