# Changelog

## [0.3.17](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.16...gensx-v0.3.17) (2025-04-01)


### ✨ New Features

* Bundle with support for native dependencies. ([#525](https://github.com/gensx-inc/gensx/issues/525)) ([7574af5](https://github.com/gensx-inc/gensx/commit/7574af5ffb42416cae936ea9a08b73b93a834a32))

## [0.3.16](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.15...gensx-v0.3.16) (2025-03-31)


### 🐛 Bug Fixes

* updating cli to match with new api shape ([#530](https://github.com/gensx-inc/gensx/issues/530)) ([f25ec1f](https://github.com/gensx-inc/gensx/commit/f25ec1faef3ba6e454304bbce9312d3446329288))

## [0.3.15](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.14...gensx-v0.3.15) (2025-03-26)


### 🐛 Bug Fixes

* Add tslib dependency. ([#522](https://github.com/gensx-inc/gensx/issues/522)) ([5b28733](https://github.com/gensx-inc/gensx/commit/5b287335b2f5937967dbcc28271ad5268899aaf2))

## [0.3.14](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.13...gensx-v0.3.14) (2025-03-25)


### 🐛 Bug Fixes

* Fallback to defaults if base URL is not supplied. ([#518](https://github.com/gensx-inc/gensx/issues/518)) ([24faa4e](https://github.com/gensx-inc/gensx/commit/24faa4e8915272cc83342ffe551d7471ae25fd51))

## [0.3.13](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.12...gensx-v0.3.13) (2025-03-21)


### 🐛 Bug Fixes

* Ensure we are respecting the env vars for app/api base urls properly. ([#507](https://github.com/gensx-inc/gensx/issues/507)) ([30e8b4b](https://github.com/gensx-inc/gensx/commit/30e8b4b14f1c29532379b871bfcca203c189932c))
* Fix type inference for StreamComponent and Provider ([#509](https://github.com/gensx-inc/gensx/issues/509)) ([2321574](https://github.com/gensx-inc/gensx/commit/232157454f65dbd5fda5817bd416dda627c154e8)), closes [#491](https://github.com/gensx-inc/gensx/issues/491)

## [0.3.12](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.11...gensx-v0.3.12) (2025-03-20)


### 🐛 Bug Fixes

* Fix type resolution errors. ([#502](https://github.com/gensx-inc/gensx/issues/502)) ([d5d1024](https://github.com/gensx-inc/gensx/commit/d5d1024b3453c604c9a9110c564a91e31c0ba9a1))
* Use select instead of multiselect for selecting AI assistant rules. ([#506](https://github.com/gensx-inc/gensx/issues/506)) ([a2c5321](https://github.com/gensx-inc/gensx/commit/a2c5321e3c96b4464ebc8873c63a157060eea6b5)), closes [#503](https://github.com/gensx-inc/gensx/issues/503)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/core bumped to 0.3.6

## [0.3.11](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.10...gensx-v0.3.11) (2025-03-19)


### ✨ New Features

* Support commonjs. ([#495](https://github.com/gensx-inc/gensx/issues/495)) ([953be8c](https://github.com/gensx-inc/gensx/commit/953be8c36db9e2def73e40a32fabf8d9828b39a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/core bumped to 0.3.5

## [0.3.10](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.9...gensx-v0.3.10) (2025-03-19)


### ✨ New Features

* Convert IDE rules packages to npx commands ([#485](https://github.com/gensx-inc/gensx/issues/485)) ([7636802](https://github.com/gensx-inc/gensx/commit/763680288b99641bd96b6f26b414550bc8ca1b7e))

## [0.3.9](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.8...gensx-v0.3.9) (2025-03-17)


### 🐛 Bug Fixes

* Fix schema extraction for structured types ([#481](https://github.com/gensx-inc/gensx/issues/481)) ([6feee26](https://github.com/gensx-inc/gensx/commit/6feee263b0eb0848fb277ecb14fe6f1246a95257))

## [0.3.8](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.7...gensx-v0.3.8) (2025-03-17)


### ✨ New Features

* Beta commands for serverless execution ([#461](https://github.com/gensx-inc/gensx/issues/461)) ([f06b765](https://github.com/gensx-inc/gensx/commit/f06b7659ea1e7f6840b0e90a497c795966c6d1ad))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/core bumped to 0.3.4

## [0.3.7](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.6...gensx-v0.3.7) (2025-03-16)


### ✨ New Features

* Add IDE AI rules integration to gensx new command ([#473](https://github.com/gensx-inc/gensx/issues/473)) ([ff57843](https://github.com/gensx-inc/gensx/commit/ff57843e9c5ca91083c330eb2cff910ee63abc23)), closes [#450](https://github.com/gensx-inc/gensx/issues/450)

## [0.3.6](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.5...gensx-v0.3.6) (2025-03-15)


### 🐛 Bug Fixes

* Use @types/node for minimum supported version (v18) in packages. ([#457](https://github.com/gensx-inc/gensx/issues/457)) ([9b5f7a5](https://github.com/gensx-inc/gensx/commit/9b5f7a54820bd282b955685b7f809f25d7a0f58f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/core bumped to 0.3.3

## [0.3.5](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.4...gensx-v0.3.5) (2025-03-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/core bumped to 0.3.2

## [0.3.4](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.3...gensx-v0.3.4) (2025-03-11)


### 🐛 Bug Fixes

* small fixes and updates to cursor rules ([#446](https://github.com/gensx-inc/gensx/issues/446)) ([53a73af](https://github.com/gensx-inc/gensx/commit/53a73af4b13381239a091fb7bf2515c930d6494d))

## [0.3.3](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.2...gensx-v0.3.3) (2025-03-07)


### ✨ New Features

* Add cursor project rules to template ([#438](https://github.com/gensx-inc/gensx/issues/438)) ([20cce63](https://github.com/gensx-inc/gensx/commit/20cce636aeb6431a45c782c84f92969f6fba16d5))

## [0.3.2](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.1...gensx-v0.3.2) (2025-03-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/core bumped to 0.3.1

## [0.3.1](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.0...gensx-v0.3.1) (2025-03-05)


### ✨ New Features

* Bundle CLI into an executable ([#412](https://github.com/gensx-inc/gensx/issues/412)) ([9fcf551](https://github.com/gensx-inc/gensx/commit/9fcf551b59140fcf6c56d5650669d97ecef900de))


### 🐛 Bug Fixes

* Cleanup release-please release-as versions ([#409](https://github.com/gensx-inc/gensx/issues/409)) ([a452bae](https://github.com/gensx-inc/gensx/commit/a452bae7d0076cae02918da06567c2854a78e3e6))

## [0.3.0](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.16...gensx-v0.3.0) (2025-03-04)


### 🐛 Bug Fixes

* Force release for all packages. ([#408](https://github.com/gensx-inc/gensx/issues/408)) ([c41a6c2](https://github.com/gensx-inc/gensx/commit/c41a6c21f66dae8f257a58ad9a7c0335471fdfef))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @gensx/core bumped to 0.3.0

## [0.1.5](https://github.com/gensx-inc/gensx/compare/gensx-cli-v0.1.4...gensx-cli-v0.1.5) (2025-03-04)


### 🐛 Bug Fixes

* Fix build ([#399](https://github.com/gensx-inc/gensx/issues/399)) ([fa26f63](https://github.com/gensx-inc/gensx/commit/fa26f63ac688f0be423a9a6ce6585b7600bb6cb1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * create-gensx bumped to 0.1.11

## [0.1.4](https://github.com/gensx-inc/gensx/compare/gensx-cli-v0.1.3...gensx-cli-v0.1.4) (2025-03-03)


### ✨ New Features

* @gensx/mcp ([#358](https://github.com/gensx-inc/gensx/issues/358)) ([37d316e](https://github.com/gensx-inc/gensx/commit/37d316e0819e3ae9ffc74f568170ff84fff4da3c))
* Don't minify packages ([#371](https://github.com/gensx-inc/gensx/issues/371)) ([2761ab8](https://github.com/gensx-inc/gensx/commit/2761ab862319858bd0447c2d006903f91d9a9b79))

## [0.1.3](https://github.com/gensx-inc/gensx/compare/gensx-cli-v0.1.2...gensx-cli-v0.1.3) (2025-02-22)


### ✨ New Features

* Prompt for login when calling new the first time. ([#307](https://github.com/gensx-inc/gensx/issues/307)) ([271dca4](https://github.com/gensx-inc/gensx/commit/271dca4a35be2403f1065dfbb9948dbbfa14920c))

## [0.1.2](https://github.com/gensx-inc/gensx/compare/gensx-cli-v0.1.1...gensx-cli-v0.1.2) (2025-02-20)


### ✨ New Features

* Colorize login command. ([#303](https://github.com/gensx-inc/gensx/issues/303)) ([36af168](https://github.com/gensx-inc/gensx/commit/36af168cab8faebad5e11d40516075ac9b2ed84d))
* Print URL to link to execution. ([#293](https://github.com/gensx-inc/gensx/issues/293)) ([3f6898e](https://github.com/gensx-inc/gensx/commit/3f6898e5cc2a02e53286f939528f6fa499b52238))


### 🐛 Bug Fixes

* Don't use global crypto. ([#298](https://github.com/gensx-inc/gensx/issues/298)) ([8ce57d8](https://github.com/gensx-inc/gensx/commit/8ce57d863185a88cb14a7f72ac70f7894b25164e))

## [0.1.1](https://github.com/gensx-inc/gensx/compare/gensx-cli-v0.1.0...gensx-cli-v0.1.1) (2025-02-19)


### 🐛 Bug Fixes

* Add hashbang for using npx gensx ([#286](https://github.com/gensx-inc/gensx/issues/286)) ([5aae4ec](https://github.com/gensx-inc/gensx/commit/5aae4ecd6786e45be77b64a7b7d6320acbe63775))

## 0.1.0 (2025-02-19)


### ✨ New Features

* CLI Device auth flow ([#212](https://github.com/gensx-inc/gensx/issues/212)) ([094b98e](https://github.com/gensx-inc/gensx/commit/094b98e12ef4239e8b04c176a14f19f5e891f5a1))
* CLI new command ([#280](https://github.com/gensx-inc/gensx/issues/280)) ([5a8743c](https://github.com/gensx-inc/gensx/commit/5a8743c0df6aa188d45239cc96169ef0671c146e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * create-gensx bumped to 0.1.8
