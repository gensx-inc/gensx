"""Custom exceptions for GenSX components."""


class GenSXError(Exception):
    """Base exception for all GenSX errors."""

    pass


class ComponentError(GenSXError):
    """Exception raised when component execution fails."""

    def __init__(self, component_name: str, message: str, original_error: Exception = None):
        self.component_name = component_name
        self.original_error = original_error
        super().__init__(f"Component '{component_name}' failed: {message}")


class WorkflowError(GenSXError):
    """Exception raised when workflow execution fails."""

    def __init__(self, workflow_name: str, message: str, original_error: Exception = None):
        self.workflow_name = workflow_name
        self.original_error = original_error
        super().__init__(f"Workflow '{workflow_name}' failed: {message}")


class ContextError(GenSXError):
    """Exception raised when context operations fail."""

    pass


class ValidationError(GenSXError):
    """Exception raised when input validation fails."""

    pass
