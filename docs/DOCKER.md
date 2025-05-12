# Docker Setup for Turborepo

This repository includes Docker configurations for building and running the Next.js applications in this Turborepo.

## Available Dockerfiles

- `Dockerfile.base`: A base Dockerfile with common configuration for all apps
- `apps/web/Dockerfile`: Dockerfile for the web application
- `apps/docs/Dockerfile`: Dockerfile for the documentation site

## Getting Started with Docker

### Building and Running Individual Services

To build and run the web app:

```bash
# From the root directory
docker build -t my-turborepo-web -f apps/web/Dockerfile .
docker run -p 3000:3000 my-turborepo-web
```

To build and run the docs app:

```bash
# From the root directory
docker build -t my-turborepo-docs -f apps/docs/Dockerfile .
docker run -p 3001:3001 my-turborepo-docs
```

### Using Docker Compose

To run all services together:

```bash
# From the root directory
docker-compose up -d
```

This will start both the web app (accessible at http://localhost:3000) and the docs app (accessible at http://localhost:3001).

To stop all services:

```bash
docker-compose down
```

## Environment Variables

You can customize the builds by setting environment variables in the `docker-compose.yml` file or when running the containers directly.

## Build Performance

The Docker setup uses multi-stage builds and caching strategies to optimize the build process. Additionally, Turborepo's caching mechanism helps to speed up repeated builds.

## Production Considerations

The Dockerfiles are configured for production use. They include:

- Standalone Next.js output for optimal production deployment
- Non-root user for security
- Proper caching of dependencies
- Multi-stage builds to reduce image size
