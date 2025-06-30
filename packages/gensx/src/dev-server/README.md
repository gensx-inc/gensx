# GenSX Dev Server - Modular Architecture

This directory contains the GenSX development server.

## Architecture Overview

The dev server has been refactored from a single large file into a modular structure with clear separation of concerns:

```
dev-server/
├── index.ts              # Main exports and public API
├── server.ts             # Main server class and orchestration
├── types.ts              # Type definitions and interfaces
├── errors.ts             # Custom error classes
├── utils.ts              # Utility functions
├── workflow-manager.ts   # Workflow registration and management
├── validation.ts         # Input validation and request parsing
├── execution-handler.ts  # Workflow execution and input request handling
├── routes.ts             # HTTP route definitions
├── openapi.ts            # OpenAPI specification generation
└── README.md             # This documentation
```

## Component Responsibilities

### Core Components

- **`server.ts`** - Main `GensxServer` class that orchestrates all components
- **`types.ts`** - All TypeScript interfaces and type definitions
- **`errors.ts`** - Custom error classes for consistent error handling
- **`utils.ts`** - Utility functions like ID generation

### Management Components

- **`workflow-manager.ts`** - Handles workflow registration, storage, and retrieval
- **`validation.ts`** - Manages input validation using Ajv schemas
- **`execution-handler.ts`** - Manages workflow execution lifecycle and input requests

### HTTP Layer

- **`routes.ts`** - All HTTP route definitions and request handling
- **`openapi.ts`** - OpenAPI specification and Swagger UI generation

## Key Benefits

1. **Separation of Concerns** - Each file has a single, clear responsibility
2. **Maintainability** - Easier to locate and modify specific functionality
3. **Testability** - Components can be tested in isolation
4. **Reusability** - Components can be reused or extended independently
5. **Readability** - Smaller files are easier to understand and navigate

## Usage

The public API remains unchanged - all existing code will continue to work:

```typescript
import { createServer } from "./dev-server.js";

const server = createServer(workflows, options, schemas);
server.start();
```

## Backward Compatibility

The original `dev-server.ts` file now simply re-exports from the new modular structure, ensuring complete backward compatibility while benefiting from the improved organization.

## Component Dependencies

```
server.ts
├── workflow-manager.ts
├── validation.ts
├── execution-handler.ts
└── routes.ts
    ├── workflow-manager.ts
    ├── validation.ts
    ├── execution-handler.ts
    └── openapi.ts
        └── types.ts
```

## Future Enhancements

This modular structure makes it easier to:

- Add new features without affecting existing code
- Implement unit tests for individual components
- Create alternative implementations (e.g., different storage backends)
- Add middleware or plugins
- Optimize specific components independently
