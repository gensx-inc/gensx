# GenSX Python Checkpoint Implementation

## Overview

This document describes the comprehensive checkpoint implementation for GenSX Python, which provides execution tracking, debugging, and replay capabilities equivalent to the TypeScript version.

## Key Components

### 1. CheckpointManager (`gensx/core/checkpoint.py`)

The `CheckpointManager` is the core component that handles:

- **Execution Tree Management**: Tracks component execution hierarchy
- **Secret Detection & Masking**: Automatically detects and masks sensitive data
- **Orphaned Node Handling**: Manages out-of-order component execution
- **API Integration**: Compresses and sends checkpoint data to GenSX API
- **Tree Validation**: Ensures execution tree consistency

#### Key Features:

```python
class CheckpointManager:
    def __init__(
        self,
        api_key: Optional[str] = None,
        org: Optional[str] = None,
        disabled: Optional[bool] = None,
        api_base_url: Optional[str] = None,
        console_base_url: Optional[str] = None,
        execution_run_id: Optional[str] = None,
        runtime: Optional[str] = None,
        runtime_version: Optional[str] = None,
    )
```

**Configuration Priority**: Constructor args > Environment variables > Defaults

**Environment Variables**:

- `GENSX_API_KEY`: API authentication key
- `GENSX_ORG`: Organization identifier
- `GENSX_CHECKPOINTS`: Enable/disable checkpoints ("false", "0", "no", "off" to disable)
- `GENSX_API_BASE_URL`: API endpoint (default: "https://api.gensx.com")
- `GENSX_CONSOLE_URL`: Console URL (default: "https://app.gensx.com")
- `GENSX_RUNTIME`: Runtime type ("cloud" or "sdk")
- `GENSX_RUNTIME_VERSION`: Runtime version
- `GENSX_EXECUTION_RUN_ID`: Execution run identifier

### 2. ExecutionNodeDict

Enhanced execution node with full checkpoint functionality:

```python
class ExecutionNodeDict:
    def __init__(
        self,
        id: str,
        component_name: str,
        start_time: float,
        props: Dict[str, Any],
        parent_id: Optional[str] = None,
        component_opts: Optional[ComponentOpts] = None,
    )
```

**Attributes**:

- `id`: Unique node identifier
- `component_name`: Component name
- `start_time`/`end_time`: Execution timing
- `props`: Component input properties
- `output`: Component execution result
- `children`: Child execution nodes
- `metadata`: Additional node metadata
- `parent_id`: Parent node reference

### 3. Secret Management

Automatic detection and masking of sensitive data:

#### Secret Detection:

- Strings longer than 8 characters (configurable via `MIN_SECRET_LENGTH`)
- Configured via `ComponentOpts.secret_props` and `ComponentOpts.secret_outputs`
- Hierarchical secret inheritance (child nodes inherit parent secrets)

#### Secret Masking:

- Replaces detected secrets with `[secret]` placeholder
- Handles nested data structures (dicts, lists, objects)
- Prevents circular reference issues
- Regex-based replacement with proper escaping

### 4. Orphaned Node Handling

Manages out-of-order component execution:

```python
def _handle_orphaned_node(self, node: ExecutionNodeDict, expected_parent_id: str) -> None:
    """Handle a node whose parent doesn't exist yet."""
    if expected_parent_id not in self.orphaned_nodes:
        self.orphaned_nodes[expected_parent_id] = set()
    self.orphaned_nodes[expected_parent_id].add(node)

    # Add diagnostic timeout to detect stuck orphans
    self._check_orphan_timeout(node.id, expected_parent_id)
```

**Features**:

- Tracks nodes waiting for parents
- Automatic attachment when parent becomes available
- 5-second timeout warning for stuck orphans
- Tree validation ensures no orphans remain

### 5. API Integration

Compressed checkpoint transmission:

```python
async def _write_checkpoint(self) -> None:
    """Write checkpoint to API with compression."""
    # 1. Create masked execution tree
    masked_root = self._mask_execution_tree(self.root)

    # 2. Compress execution data with gzip
    compressed_execution = gzip.compress(json.dumps(execution_data).encode("utf-8"))
    base64_compressed_execution = base64.b64encode(compressed_execution).decode("ascii")

    # 3. Send to API endpoint
    # POST /org/{org}/traces (new trace)
    # PUT /org/{org}/traces/{traceId} (update existing)
```

**Payload Structure**:

```json
{
  "executionId": "uuid",
  "version": 1,
  "schemaVersion": 2,
  "workflowName": "ComponentName",
  "startedAt": 1234567890000,
  "completedAt": 1234567890000,
  "rawExecution": "base64-compressed-execution-tree",
  "steps": 5,
  "runtime": "sdk",
  "runtimeVersion": "0.1.0",
  "executionRunId": "optional-run-id"
}
```

### 6. Integration with Components

Automatic checkpoint integration via component decorator:

```python
@Component("MyComponent")
async def my_component(props: dict) -> str:
    return f"Hello {props['name']}"
```

**Checkpoint Flow**:

1. Component execution starts → `add_node()`
2. Component completes → `complete_node()`
3. Errors occur → `add_metadata()` with error details
4. Tree updates → `_update_checkpoint()` triggers API write

### 7. Test Utilities (`tests/utils/execute_with_checkpoints.py`)

Comprehensive testing utilities for checkpoint functionality:

#### `execute_with_checkpoints()`

```python
async def execute_with_checkpoints(
    component_fn: Callable[[P], R],
    props: P,
    options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute a component with checkpoint tracking."""
```

**Returns**:

```python
{
    "result": "execution_result",
    "checkpoints": [ExecutionNodeDict, ...],
    "checkpoint_manager": CheckpointManager,
    "api_calls": [dict, ...],
    "workflow_names": [str, ...]
}
```

#### `execute_workflow_with_checkpoints()`

```python
async def execute_workflow_with_checkpoints(
    component_fn: Callable[[P], R],
    props: P,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
```

#### `get_execution_from_api_call()`

```python
def get_execution_from_api_call(api_call_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract execution data from API call data."""
```

## Testing

### Test Coverage

**Core Checkpoint Tests** (`tests/test_checkpoint.py`):

- Component execution tracking
- Node creation and management
- Parent-child relationships
- Orphaned node handling
- Node completion and metadata
- Secret value collection and scrubbing
- Tree validation
- Full workflow execution

**Integration Tests** (`tests/test_checkpoint_integration.py`):

- Basic component execution with checkpoint capture
- Nested component hierarchy tracking
- Workflow execution (basic verification)
- Secret handling in real execution
- Error handling and checkpoint capture
- Metadata capture verification
- Multiple component tracking

**Total**: 42 tests passing

### Example Usage

```python
# Basic component with checkpoints
@Component("DataProcessor")
async def process_data(props: dict) -> dict:
    return {"processed": props["data"].upper()}

# Component with secret handling
@Component("APIClient", opts=ComponentOpts(
    secret_props=["api_key"],
    secret_outputs=True
))
async def call_api(props: dict) -> dict:
    # api_key will be automatically masked in checkpoints
    return {"response": f"Called API with {props['data']}"}

# Testing with checkpoint capture
result_data = await execute_with_checkpoints(
    process_data,
    {"data": "hello"},
    {"name": "TestProcessor"}
)

assert result_data["result"]["processed"] == "HELLO"
assert len(result_data["checkpoints"]) >= 1
```

## Key Differences from TypeScript

1. **Python-native async/await**: Uses Python's asyncio throughout
2. **Context management**: Uses `contextvars` for thread-safe context
3. **Type hints**: Strong typing with `TypeVar`, `Protocol`, and `Pydantic`
4. **Error handling**: Python exception model with custom `GenSXError` hierarchy
5. **Testing**: Uses `pytest` with `pytest-asyncio` for async test support

## Performance Considerations

1. **Non-blocking writes**: Checkpoint writes are asynchronous and non-blocking
2. **Compression**: All checkpoint data is gzip-compressed before transmission
3. **Batching**: Multiple updates are batched to avoid excessive API calls
4. **Memory management**: Circular reference detection prevents memory leaks
5. **Lazy evaluation**: Tree validation only occurs when necessary

## Security Features

1. **Automatic secret detection**: No manual configuration required for basic cases
2. **Hierarchical masking**: Secrets propagate through execution tree
3. **Configurable sensitivity**: Adjustable minimum secret length
4. **Safe serialization**: Handles circular references and unserializable objects
5. **API key protection**: Environment variable configuration prevents hardcoding

## Future Enhancements

1. **Real HTTP client**: Replace mock API calls with actual HTTP requests (aiohttp)
2. **Retry logic**: Add exponential backoff for failed checkpoint writes
3. **Local storage**: Option to store checkpoints locally for offline debugging
4. **Streaming checkpoints**: Real-time checkpoint streaming for long-running workflows
5. **Checkpoint replay**: Ability to replay execution from checkpoint data
