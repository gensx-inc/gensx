# GenSX

GenSX is a development framework and server for building and deploying workflow-based applications.

## Features

- **Workflow Execution**: Execute complex workflows with checkpointing and state management
- **Development Server**: Built-in development server with hot reload
- **Schema Validation**: Automatic input/output validation using TypeScript schemas
- **Graceful Shutdown**: ECS-ready graceful shutdown with worker draining
- **Health Checks**: Built-in health check endpoints for container orchestration

## Graceful Shutdown for ECS Deployments

GenSX includes built-in graceful shutdown functionality designed for ECS (Amazon Elastic Container Service) deployments. This ensures that active workflow executions complete before the container is terminated during rolling deployments.

### How It Works

1. **Signal Handling**: The server automatically registers handlers for `SIGTERM` and `SIGINT` signals
2. **Request Rejection**: During shutdown, new requests return HTTP 503 (Service Unavailable)
3. **Active Execution Tracking**: The server tracks all running workflow executions
4. **Drain Period**: Waits for active executions to complete within a configurable timeout
5. **Health Check Integration**: Provides `/health` endpoint that returns 503 when draining

### Configuration

```typescript
import { createServer } from '@gensx/gensx';

const server = createServer(workflows, {
  port: 3000,
  hostname: 'localhost',
  shutdownTimeout: 30000, // 30 seconds (default)
  logger: {
    info: console.info,
    error: console.error,
    warn: console.warn,
  }
});

server.start();
```

### Health Check Endpoint

The server exposes a `/health` endpoint that can be used for ECS health checks:

- **Status 200**: Server is healthy and ready to accept requests
- **Status 503**: Server is draining (has active executions) or shutting down

Response format:
```json
{
  "status": "healthy" | "draining",
  "activeExecutions": 0,
  "totalExecutions": 5,
  "readyForTermination": true
}
```

### ECS Task Definition Example

For ECS deployments, configure your task definition with appropriate health checks and stop timeout:

```json
{
  "family": "gensx-worker",
  "containerDefinitions": [
    {
      "name": "gensx-app",
      "image": "your-registry/gensx-app:latest",
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "stopTimeout": 45
    }
  ]
}
```

### Manual Graceful Shutdown

You can also trigger graceful shutdown programmatically:

```typescript
// Graceful shutdown will wait for active executions to complete
await server.gracefulShutdown();
```

## Development

This package is part of the GenSX monorepo. See the main README for development instructions.
