# Graceful Shutdown Implementation for ECS Worker Draining

## Overview

This document outlines the implementation of graceful shutdown functionality for GenSX to address [Issue #200](https://github.com/gensx-inc/gensx-console/issues/200): "Ensure that ECS waits for workers to drain before replacing task".

## Problem Statement

When deploying GenSX workers on AWS ECS, task replacements during rolling deployments could terminate containers while workflow executions were still in progress, leading to:

- Interrupted long-running workflows
- Lost work and potential data inconsistency
- Poor user experience with failed executions

## Solution

Implemented comprehensive graceful shutdown functionality that ensures ECS waits for active workflow executions to complete before terminating containers.

## Implementation Details

### 1. Signal Handling

**File**: `packages/gensx/src/dev-server/server.ts`

- Added signal handlers for `SIGTERM` and `SIGINT`
- Automatically triggers graceful shutdown process when signals are received
- Prevents multiple shutdown processes from running simultaneously

```typescript
private registerSignalHandlers(): void {
  if (this.signalHandlersRegistered) {
    return;
  }

  const handleShutdown = (signal: string) => {
    this.logger.info(`🔄 Received ${signal}, initiating graceful shutdown...`);
    this.gracefulShutdown().catch((error) => {
      this.logger.error("❌ Error during graceful shutdown:", error);
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  
  this.signalHandlersRegistered = true;
}
```

### 2. Active Execution Tracking

**File**: `packages/gensx/src/dev-server/workflow-manager.ts`

- Added `getAllExecutions()` method to retrieve all workflow executions
- Track executions with statuses: "queued", "starting", "running", "completed", "failed"
- Filter active executions (those in "starting" or "running" states)

```typescript
getAllExecutions(): WorkflowExecution[] {
  return Array.from(this.executionsMap.values());
}
```

### 3. Request Rejection During Shutdown

**File**: `packages/gensx/src/dev-server/server.ts`

- Added middleware to reject new requests during shutdown with HTTP 503
- Ensures no new work starts while draining

```typescript
// Add middleware to check shutdown state before processing requests
this.app.use('*', async (c, next) => {
  if (this.isShuttingDown) {
    return c.json({ 
      error: "Service unavailable", 
      message: "Server is shutting down" 
    }, 503);
  }
  await next();
});
```

### 4. Graceful Shutdown Process

**File**: `packages/gensx/src/dev-server/server.ts`

- Implements drain period with configurable timeout
- Monitors active executions and waits for completion
- Logs progress and provides clear feedback
- Forces shutdown after timeout if executions don't complete

```typescript
public async gracefulShutdown(): Promise<void> {
  if (this.isShuttingDown) {
    this.logger.warn("⚠️ Graceful shutdown already in progress");
    return;
  }

  this.isShuttingDown = true;
  this.logger.info("🛑 Starting graceful shutdown process...");

  try {
    // Wait for active executions to complete
    await this.waitForActiveExecutions();
    
    // Stop the server
    await this.stop();
    
    this.logger.info("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    this.logger.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
}
```

### 5. Health Check Endpoint

**File**: `packages/gensx/src/dev-server/routes.ts`

- Added `/health` endpoint for ECS health checks
- Returns different status codes based on server state:
  - **200**: Healthy and ready to accept requests
  - **503**: Draining (has active executions) or shutting down

```typescript
app.get('/health', (c) => {
  const allExecutions = workflowManager.getAllExecutions();
  const activeExecutions = allExecutions.filter(execution => 
    execution.executionStatus === 'starting' || 
    execution.executionStatus === 'running'
  );

  const isHealthy = activeExecutions.length === 0;
  const status = isHealthy ? 200 : 503;

  return c.json({
    status: isHealthy ? 'healthy' : 'draining',
    activeExecutions: activeExecutions.length,
    totalExecutions: allExecutions.length,
    readyForTermination: isHealthy
  }, status);
});
```

### 6. Configuration Options

**File**: `packages/gensx/src/dev-server/types.ts`

- Added `shutdownTimeout` option to `ServerOptions` interface
- Configurable timeout for how long to wait for executions to complete

```typescript
export interface ServerOptions {
  port?: number;
  hostname?: string;
  shutdownTimeout?: number; // Timeout in milliseconds for graceful shutdown
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, error?: unknown) => void;
    warn: (message: string) => void;
  };
}
```

## Usage for ECS Deployments

### 1. Server Configuration

```typescript
import { createServer } from '@gensx/gensx';

const server = createServer(workflows, {
  port: 3000,
  shutdownTimeout: 30000, // 30 seconds
  logger: {
    info: console.info,
    error: console.error,
    warn: console.warn,
  }
});

server.start();
```

### 2. ECS Task Definition

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

### 3. Health Check Integration

The `/health` endpoint allows ECS to:
- Monitor container health
- Determine when a container is ready for termination
- Implement proper load balancer deregistration timing

## Benefits

1. **Zero Downtime Deployments**: Workflows complete before container termination
2. **Data Consistency**: No interrupted executions that could leave data in inconsistent states
3. **Better User Experience**: Users don't experience failed executions due to deployments
4. **ECS Integration**: Works seamlessly with ECS health checks and rolling deployments
5. **Configurable**: Timeout and other settings can be adjusted based on workflow characteristics

## Testing

Comprehensive test suite added to verify:
- Signal handling triggers graceful shutdown
- Active executions are properly tracked
- Server rejects new requests during shutdown
- Health endpoint returns correct status codes
- Timeout handling for long-running executions

## Files Modified

1. `packages/gensx/src/dev-server/server.ts` - Core graceful shutdown logic
2. `packages/gensx/src/dev-server/types.ts` - Added configuration options
3. `packages/gensx/src/dev-server/routes.ts` - Added health check endpoint
4. `packages/gensx/src/dev-server/workflow-manager.ts` - Added execution tracking
5. `packages/gensx/tests/dev-server.test.ts` - Added comprehensive tests
6. `packages/gensx/README.md` - Updated documentation

## Future Enhancements

1. **Metrics Integration**: Add Prometheus metrics for monitoring drain times
2. **Execution Priorities**: Allow prioritization of certain executions during shutdown
3. **Custom Drain Strategies**: Support different strategies for different workflow types
4. **Graceful Restart**: Support for graceful restart without container replacement

This implementation ensures that ECS deployments respect active workflow executions and provides a robust foundation for production workloads.