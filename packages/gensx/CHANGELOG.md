# Changelog

## [0.3.38](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.37...gensx-v0.3.38) (2025-06-20)


### ✨ New Features

* Add --progress CLI param for run command to stream the progress events after calling start. ([#797](https://github.com/gensx-inc/gensx/issues/797)) ([21b24b8](https://github.com/gensx-inc/gensx/commit/21b24b8a5038154e7765df00f3acca090430cfec))

## [0.3.37](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.36...gensx-v0.3.37) (2025-06-17)


### ✨ New Features

* adding project cli commands ([#786](https://github.com/gensx-inc/gensx/issues/786)) ([49bf402](https://github.com/gensx-inc/gensx/commit/49bf402d9e92145d2446ddfcb16ef465310f447a)), closes [#782](https://github.com/gensx-inc/gensx/issues/782)

## [0.3.36](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.35...gensx-v0.3.36) (2025-06-13)


### 🐛 Bug Fixes

* Fix dev server to use messageListener. ([#771](https://github.com/gensx-inc/gensx/issues/771)) ([17c0f71](https://github.com/gensx-inc/gensx/commit/17c0f71aad680e499ec992c3d6dbc2ed8f831c99))
* Improve local dev experience ([#759](https://github.com/gensx-inc/gensx/issues/759)) ([9563b7e](https://github.com/gensx-inc/gensx/commit/9563b7e6fc1bf32550a2ca1d4384fee1c1762a23))
* prevent components from showing up as APIs in the dev server ([#766](https://github.com/gensx-inc/gensx/issues/766)) ([6a2ad7a](https://github.com/gensx-inc/gensx/commit/6a2ad7aed910a5bf134a56b8476992ef417acb4b)), closes [#763](https://github.com/gensx-inc/gensx/issues/763)
* small updates to verbiage ([#746](https://github.com/gensx-inc/gensx/issues/746)) ([48ff3b4](https://github.com/gensx-inc/gensx/commit/48ff3b474f091aebaada2c03eedfed8f66a3b8a9))

## [0.3.35](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.34...gensx-v0.3.35) (2025-06-03)


### ✨ New Features

* Support stream progress ([#731](https://github.com/gensx-inc/gensx/issues/731)) ([4a1bf59](https://github.com/gensx-inc/gensx/commit/4a1bf59675948bf545118c6dc66e53896b903e57))


### 🐛 Bug Fixes

* persist environment selection in CLI after deployments ([#727](https://github.com/gensx-inc/gensx/issues/727)) ([26259dd](https://github.com/gensx-inc/gensx/commit/26259dda43cf9b5619b7545ddb1f47ef66d25ee9))

## [0.3.34](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.33...gensx-v0.3.34) (2025-05-30)


### ✨ New Features

* upgrading template from alpha to stable package versions ([#718](https://github.com/gensx-inc/gensx/issues/718)) ([5f5890a](https://github.com/gensx-inc/gensx/commit/5f5890a9e437f51b5b23110b7487bb5c11ce4bce))

## [0.3.33](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.32...gensx-v0.3.33) (2025-05-29)


### 🐛 Bug Fixes

* updating schema detection for v2 programming model ([#716](https://github.com/gensx-inc/gensx/issues/716)) ([fed18cf](https://github.com/gensx-inc/gensx/commit/fed18cf54ef79cea779c726ff7e4783d1a2c0782))

## [0.3.32](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.31...gensx-v0.3.32) (2025-05-28)


### ✨ New Features

* upgrading to programming model v2 ([#708](https://github.com/gensx-inc/gensx/issues/708)) ([2b5bbd1](https://github.com/gensx-inc/gensx/commit/2b5bbd142a0c0184921302e7b6babe17d84c2dff))

## [0.3.31](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.30...gensx-v0.3.31) (2025-05-20)


### 🐛 Bug Fixes

* removing -ev cli option in favor of -e ([#687](https://github.com/gensx-inc/gensx/issues/687)) ([06cca73](https://github.com/gensx-inc/gensx/commit/06cca732dd59f8cd080e55314e6a09a45802f21e))
* resolves bug preventing deployment if project doesn't exist ([#689](https://github.com/gensx-inc/gensx/issues/689)) ([2971062](https://github.com/gensx-inc/gensx/commit/2971062f9b9be3c129a6c0c984c03f082134cce7))

## [0.3.30](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.29...gensx-v0.3.30) (2025-05-15)


### 🐛 Bug Fixes

* fixing bug writing and finding build files in start command ([#684](https://github.com/gensx-inc/gensx/issues/684)) ([01bf882](https://github.com/gensx-inc/gensx/commit/01bf882e418952a68d4231819a203dfaf9775fdb))
* making user agent logic permissive ([#682](https://github.com/gensx-inc/gensx/issues/682)) ([9c70e71](https://github.com/gensx-inc/gensx/commit/9c70e71354fa0446d68c6e2eb3e2e0282fd80f86))

## [0.3.29](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.28...gensx-v0.3.29) (2025-05-14)


### ✨ New Features

* updating remaining CLI commands to use ink ([#677](https://github.com/gensx-inc/gensx/issues/677)) ([098647e](https://github.com/gensx-inc/gensx/commit/098647e67044bfe460f6a8dd20fa1a8b4ae9fac3))
* upgrading env cli commands to use ink ([#670](https://github.com/gensx-inc/gensx/issues/670)) ([aad4b26](https://github.com/gensx-inc/gensx/commit/aad4b26502a240e83b2159f03410017327923cce))


### 📚 Documentation

* fixing build of website ([#673](https://github.com/gensx-inc/gensx/issues/673)) ([d5eeb63](https://github.com/gensx-inc/gensx/commit/d5eeb635e2d5dcea5b6bf793b764b408a95684d9))

## [0.3.28](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.27...gensx-v0.3.28) (2025-05-07)


### ✨ New Features

* wiring up support for description in gensx.yaml ([#641](https://github.com/gensx-inc/gensx/issues/641)) ([04bbbee](https://github.com/gensx-inc/gensx/commit/04bbbee2443a1110af489db3493ed31e38c1f234))

## [0.3.27](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.26...gensx-v0.3.27) (2025-04-30)


### ✨ New Features

* adding --yes param for bypassing confirmation prompts ([#656](https://github.com/gensx-inc/gensx/issues/656)) ([44092af](https://github.com/gensx-inc/gensx/commit/44092af10c6d099dc476133568c21b5e55bd72b5))


### 🐛 Bug Fixes

* fixing but with schema detection only using main file ([#653](https://github.com/gensx-inc/gensx/issues/653)) ([c84e5aa](https://github.com/gensx-inc/gensx/commit/c84e5aac3dc966867c19452feb157ad4327b5619)), closes [#634](https://github.com/gensx-inc/gensx/issues/634)

## [0.3.26](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.25...gensx-v0.3.26) (2025-04-29)


### 🐛 Bug Fixes

* Remove gating for deploy/environment/etc. ([#642](https://github.com/gensx-inc/gensx/issues/642)) ([76ec7c4](https://github.com/gensx-inc/gensx/commit/76ec7c433149d006a159ccd1b3ee00bddb7bee1e))

## [0.3.25](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.24...gensx-v0.3.25) (2025-04-28)


### ✨ New Features

* updating dev server to be at parity with prod APIs ([#626](https://github.com/gensx-inc/gensx/issues/626)) ([74a4ce6](https://github.com/gensx-inc/gensx/commit/74a4ce6f763969ce431479c0c51e46b7ed0f990e))
* updating template project to be deployable ([#632](https://github.com/gensx-inc/gensx/issues/632)) ([41fa055](https://github.com/gensx-inc/gensx/commit/41fa05506b9d67f3acf666d3e8dfea2b73353f4b)), closes [#586](https://github.com/gensx-inc/gensx/issues/586)


### 🐛 Bug Fixes

* fixing env in run command and allowing empty inputs ([#633](https://github.com/gensx-inc/gensx/issues/633)) ([abfce37](https://github.com/gensx-inc/gensx/commit/abfce37b8cf4fc4c3e341a13c89defe0f20f4a74))

## [0.3.24](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.23...gensx-v0.3.24) (2025-04-24)


### 🐛 Bug Fixes

* updating packages to remove response envelope ([#623](https://github.com/gensx-inc/gensx/issues/623)) ([fe39cde](https://github.com/gensx-inc/gensx/commit/fe39cdec6bbed38e96e4b4e3f27b0af68b09b977))

## [0.3.23](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.22...gensx-v0.3.23) (2025-04-23)


### 🐛 Bug Fixes

* Use buildId instead of deploymentId. ([#616](https://github.com/gensx-inc/gensx/issues/616)) ([99b08c7](https://github.com/gensx-inc/gensx/commit/99b08c70a07c1281607df4e39d53218499db56e8))

## [0.3.22](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.21...gensx-v0.3.22) (2025-04-23)


### ✨ New Features

* adding port option to dev server ([#605](https://github.com/gensx-inc/gensx/issues/605)) ([85d797d](https://github.com/gensx-inc/gensx/commit/85d797ddf1115800ba29bdb21f6ae3d9f945d255)), closes [#598](https://github.com/gensx-inc/gensx/issues/598)
* updating CLI commands to use environments ([#574](https://github.com/gensx-inc/gensx/issues/574)) ([e596b9e](https://github.com/gensx-inc/gensx/commit/e596b9e11eacbda817a11c8c51189011326a2bf1))


### 🐛 Bug Fixes

* fixing bug with env and envvars not being passed properly ([#611](https://github.com/gensx-inc/gensx/issues/611)) ([81002c5](https://github.com/gensx-inc/gensx/commit/81002c5f57d1bd79c0fd3b538370e33fef456d4a))
* removing input wrapper from run command ([#613](https://github.com/gensx-inc/gensx/issues/613)) ([5b45883](https://github.com/gensx-inc/gensx/commit/5b45883e3c878da0110c418870ac82663914db39))

## [0.3.21](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.20...gensx-v0.3.21) (2025-04-16)


### 🐛 Bug Fixes

* Don't import json so that there is no warning. ([#570](https://github.com/gensx-inc/gensx/issues/570)) ([ce7154f](https://github.com/gensx-inc/gensx/commit/ce7154f767b66393b7d6aba654f0f6cf4aa13f02))
* update docker command to always pull latest image ([#564](https://github.com/gensx-inc/gensx/issues/564)) ([87d478b](https://github.com/gensx-inc/gensx/commit/87d478bbe8f812ce9a6e5416a23dca863cee186c))
* Use the right URL after deployments. ([#571](https://github.com/gensx-inc/gensx/issues/571)) ([ebda1d6](https://github.com/gensx-inc/gensx/commit/ebda1d6c7f847554b2379c15dc6bf86c95aa3888))

## [0.3.20](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.19...gensx-v0.3.20) (2025-04-11)


### 🐛 Bug Fixes

* Fix bundling of storage package. ([#557](https://github.com/gensx-inc/gensx/issues/557)) ([64531e9](https://github.com/gensx-inc/gensx/commit/64531e92dbedaa6859fc2afa158682bb537090b6))

## [0.3.19](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.18...gensx-v0.3.19) (2025-04-10)


### ✨ New Features

* Proper commonjs support ([#545](https://github.com/gensx-inc/gensx/issues/545)) ([137c51b](https://github.com/gensx-inc/gensx/commit/137c51bb6ed408440ef9e0330ed3b887a12feeb3))

## [0.3.18](https://github.com/gensx-inc/gensx/compare/gensx-v0.3.17...gensx-v0.3.18) (2025-04-09)


### ✨ New Features

* support a local dev server ([#524](https://github.com/gensx-inc/gensx/issues/524)) ([2288609](https://github.com/gensx-inc/gensx/commit/2288609e860210ad32b6e6641425cfefe23e136c))


### 🐛 Bug Fixes

* adding platform to docker build command ([#537](https://github.com/gensx-inc/gensx/issues/537)) ([b1d34b2](https://github.com/gensx-inc/gensx/commit/b1d34b285e101caddccd4b471fd42fd804484d7b))
* Update docker namespace. ([#539](https://github.com/gensx-inc/gensx/issues/539)) ([065ef9f](https://github.com/gensx-inc/gensx/commit/065ef9f7dd19c61bf870c14ae05ed662d56a3368))

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
