# GenSX CLI (Deno Binary)

This package provides a Deno-compatible binary distribution of the GenSX CLI tool.

## Building

To build the binary, you need [Deno](https://deno.land/) installed. Then run:

```bash
deno task compile
```

This will create a binary named `gensx-cli` in the current directory.

### Cross-Compilation

You can build binaries for different platforms using these commands:

```bash
# Build for Windows
deno task compile:win

# Build for Linux
deno task compile:linux

# Build for macOS
deno task compile:macos

# Build for all platforms
deno task compile:all
```

The binaries will be named:

- Windows: `gensx-cli-windows.exe`
- Linux: `gensx-cli-linux`
- macOS: `gensx-cli-macos`

## Permissions

The binary requires the following permissions:

- `--allow-read`: For reading files and configurations
- `--allow-write`: For creating new projects
- `--allow-net`: For network access (login, etc.)
- `--allow-env`: For environment variables
- `--allow-run`: For running commands
- `--allow-sys`: For system information

These permissions are automatically included when compiling the binary.

## Usage

The binary provides the same interface as the npm package:

```bash
./gensx-cli-[platform] --help
```

Available commands:

- `login`: Login to GenSX Cloud
- `new`: Create a new GenSX project
