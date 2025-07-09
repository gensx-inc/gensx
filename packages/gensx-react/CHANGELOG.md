# Changelog

## [Unreleased]

### Added
- **JSON Patch Support**: Updated `useObject` hook to support the new JSON patch mechanism from `@gensx/core`
- **String Optimizations**: Automatic handling of string-append and string-diff operations for improved streaming performance
- **Performance Improvements**: Up to 55% reduction in message size for streaming content scenarios

### Changed
- **useObject Hook**: Now reconstructs object state from JSON patches instead of using complete object data
- **Error Handling**: Improved error handling with graceful fallback to previous state when patches fail to apply

### Technical Details
- Added `applyObjectPatches` import from `@gensx/core` for patch reconstruction
- Implemented sequential patch application with proper state management
- Added support for `isInitial` flag to handle state resets
- Maintained full backward compatibility with existing code

### Migration
- **No Breaking Changes**: Existing code using `useObject` will continue to work without modifications
- **Automatic Benefits**: Existing applications will automatically benefit from performance improvements when used with the new patch-based system

## [0.1.4](https://github.com/gensx-inc/gensx/compare/gensx-react-v0.1.3...gensx-react-v0.1.4) (2025-07-03)


### 🐛 Bug Fixes

* make types for useObject more flexible ([#833](https://github.com/gensx-inc/gensx/issues/833)) ([044ee13](https://github.com/gensx-inc/gensx/commit/044ee13ead8e19783a85761aa62a85e5e1371164))

## [0.1.3](https://github.com/gensx-inc/gensx/compare/gensx-react-v0.1.2...gensx-react-v0.1.3) (2025-06-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/client bumped to 0.1.3
    * @gensx/core bumped to 0.4.7

## [0.1.2](https://github.com/gensx-inc/gensx/compare/gensx-react-v0.1.1...gensx-react-v0.1.2) (2025-06-20)


### 📚 Documentation

* updated draft pad example ([#791](https://github.com/gensx-inc/gensx/issues/791)) ([41d1103](https://github.com/gensx-inc/gensx/commit/41d1103a889e448be34c663e31d6e78570df3f56))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/client bumped to 0.1.2
    * @gensx/core bumped to 0.4.6

## [0.1.1](https://github.com/gensx-inc/gensx/compare/gensx-react-v0.1.0...gensx-react-v0.1.1) (2025-06-20)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/client bumped to 0.1.1
    * @gensx/core bumped to 0.4.5

## 0.1.0 (2025-06-17)


### ✨ New Features

* Added sdk, custom hook, and example app (draft pad) ([#761](https://github.com/gensx-inc/gensx/issues/761)) ([527808a](https://github.com/gensx-inc/gensx/commit/527808aebc9dc9e5fea37f021a15f81c8ad454d1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/client bumped to 0.1.0
    * @gensx/core bumped to 0.4.4
