"""
Configuration file handling for GenSX.

Reads configuration from platform-specific paths:
- Unix/Linux/macOS: ~/.config/gensx/config
- Windows: %APPDATA%\gensx\config
"""

import configparser
import os
import platform
from pathlib import Path
from typing import Dict, Any, Optional


class GensxConfig:
    """GenSX configuration container."""

    def __init__(self, config_dict: Dict[str, Any]):
        self.api = config_dict.get("api", {})
        self.console = config_dict.get("console", {})

    @property
    def api_token(self) -> Optional[str]:
        """Get API token from config."""
        return self.api.get("token")

    @property
    def api_org(self) -> Optional[str]:
        """Get organization from config."""
        return self.api.get("org")

    @property
    def api_base_url(self) -> Optional[str]:
        """Get API base URL from config."""
        return self.api.get("baseUrl")

    @property
    def console_base_url(self) -> Optional[str]:
        """Get console base URL from config."""
        return self.console.get("baseUrl")


def get_config_path() -> str:
    """Get the platform-specific config file path."""
    # Allow override through environment variable
    if os.environ.get("GENSX_CONFIG_DIR"):
        return os.path.join(os.environ["GENSX_CONFIG_DIR"], "config")

    home = Path.home()

    # Platform-specific paths
    if platform.system() == "Windows":
        # Windows: %APPDATA%\gensx\config
        app_data = os.environ.get("APPDATA", home / "AppData" / "Roaming")
        return os.path.join(app_data, "gensx", "config")

    # Unix-like systems (Linux, macOS): ~/.config/gensx/config
    xdg_config_home = os.environ.get("XDG_CONFIG_HOME", home / ".config")
    return os.path.join(xdg_config_home, "gensx", "config")


def read_config() -> GensxConfig:
    """
    Read GenSX configuration from the standard config file location.

    Returns empty config if file doesn't exist or can't be read.
    """
    # Don't read config in tests
    if os.environ.get("NODE_ENV") == "test":
        return GensxConfig({})

    try:
        config_path = get_config_path()

        if not os.path.exists(config_path):
            return GensxConfig({})

        # Parse INI format config file
        parser = configparser.ConfigParser()
        parser.read(config_path)

        # Convert to dictionary
        config_dict = {}
        for section_name in parser.sections():
            config_dict[section_name] = dict(parser[section_name])

        return GensxConfig(config_dict)

    except Exception:
        # If file doesn't exist or can't be read, return empty config
        return GensxConfig({})
