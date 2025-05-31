"""SDK wrapping functionality for GenSX."""

import inspect
from typing import Any, Callable, Dict, List, Optional

from ..core.component import Component
from ..core.types import ComponentOpts


class WrapOptions:
    """Options for wrapping SDKs and functions."""

    def __init__(
        self,
        prefix: Optional[str] = None,
        get_component_opts: Optional[Callable[[List[str], Any], ComponentOpts]] = None,
        replacement_implementations: Optional[Dict[str, Callable]] = None,
    ):
        self.prefix = prefix
        self.get_component_opts = get_component_opts
        self.replacement_implementations = replacement_implementations or {}


def wrap(sdk: Any, opts: Optional[WrapOptions] = None) -> Any:
    """
    Recursively wrap an SDK instance and return a proxy whose functions
    are GenSX components and whose objects are wrapped proxies.

    Args:
        sdk: The SDK instance to wrap
        opts: Optional configuration for the wrapper

    Returns:
        A proxy object where methods are converted to GenSX components
    """
    if opts is None:
        opts = WrapOptions()

    def make_proxy(target: Any, path: List[str]) -> Any:
        """
        Internal helper that builds a proxy for target and keeps track of the
        path so we can generate sensible component names like:
        "OpenAI.chat.completions.create"
        """

        class ComponentProxy:
            def __init__(self, wrapped_target: Any, wrapped_path: List[str]):
                self._target = wrapped_target
                self._path = wrapped_path

            def __getattr__(self, name: str) -> Any:
                try:
                    value = getattr(self._target, name)
                except AttributeError:
                    raise AttributeError(f"'{self._target.__class__.__name__}' object has no attribute '{name}'")

                new_path = self._path + [name]
                path_str = ".".join(new_path)

                # Check for replacement implementation
                if path_str in opts.replacement_implementations:
                    return opts.replacement_implementations[path_str](self._target, value)

                # Case 1: it's a function → return a GenSX component
                if callable(value) and not inspect.isclass(value):
                    component_name = (
                        f"{opts.prefix}.{path_str}" if opts.prefix else path_str
                    )

                    # Get component options if provided
                    component_opts = None
                    if opts.get_component_opts:
                        component_opts = opts.get_component_opts(new_path, value)

                    # Bind the original `self` so SDK internals keep working
                    if hasattr(value, "__self__"):
                        # Already bound method
                        bound_fn = value
                    else:
                        # Unbound method, bind it to the target
                        bound_fn = value.__get__(self._target, type(self._target))

                    return Component(component_name, bound_fn, component_opts)

                # Case 2: it's an object that might contain more functions
                if (
                    hasattr(value, "__dict__")
                    and not isinstance(value, (str, int, float, bool, type(None)))
                    and not inspect.ismodule(value)
                ):
                    return make_proxy(value, new_path)

                # Case 3: primitive or unhandled → pass through untouched
                return value

            def __setattr__(self, name: str, value: Any) -> None:
                if name.startswith("_"):
                    # Allow setting private attributes on the proxy
                    super().__setattr__(name, value)
                else:
                    # Set attributes on the wrapped target
                    setattr(self._target, name, value)

            def __repr__(self) -> str:
                return f"<GenSX Wrapped {self._target.__class__.__name__}>"

        return ComponentProxy(target, path)

    # Kick things off with the SDK's constructor name as the first path element
    if hasattr(sdk, "__class__") and sdk.__class__.__name__ != "object":
        root_name = sdk.__class__.__name__
    else:
        root_name = "sdk"

    return make_proxy(sdk, [root_name])


class Wrap:
    """
    A class decorator that wraps all methods of a class into GenSX components.
    This allows you to use any class as a collection of GenSX components.
    """

    def __init__(self, options: Optional[WrapOptions] = None):
        self.options = options or WrapOptions()

    def __call__(self, cls):
        """Apply the wrapper to a class."""
        original_init = cls.__init__

        def wrapped_init(self, *args, **kwargs):
            # Call the original constructor
            original_init(self, *args, **kwargs)
            # Wrap the instance
            wrapped_instance = wrap(self, self.options)
            # Replace the instance's __dict__ with the wrapped version's behavior
            # This is a bit tricky in Python, so we'll use a simpler approach
            self.__dict__.update(wrapped_instance.__dict__)

        cls.__init__ = wrapped_init
        return cls
