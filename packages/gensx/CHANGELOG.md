# Changelog

## [0.2.9](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.8...gensx-v0.2.9) (2025-02-12)


### 🐛 Bug Fixes

* Remove console.log and fix eslint. ([#213](https://github.com/gensx-inc/gensx/issues/213)) ([a408e62](https://github.com/gensx-inc/gensx/commit/a408e62d6d15201b97351ef7d7f8c1f656941cef))
* Separate `children` from other props before component execution ([#231](https://github.com/gensx-inc/gensx/issues/231)) ([954ac75](https://github.com/gensx-inc/gensx/commit/954ac75fc9f6a6c1c9bd8c3b2c3b2565f92ef8da))
* various fixes for handling of functions and streams during resolution and checkpointing ([#232](https://github.com/gensx-inc/gensx/issues/232)) ([f58556c](https://github.com/gensx-inc/gensx/commit/f58556c1b5c851144e777673c4c2fe04c7f9b27f))

## [0.2.8](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.7...gensx-v0.2.8) (2025-01-31)


### ✨ New Features

* adding the ability to rename components via componentOpts ([#207](https://github.com/gensx-inc/gensx/issues/207)) ([516366e](https://github.com/gensx-inc/gensx/commit/516366e34ecf39e62645fde3ec6e677ded403889))
* Update checkpoint call to match the new API shape. ([#189](https://github.com/gensx-inc/gensx/issues/189)) ([1884212](https://github.com/gensx-inc/gensx/commit/1884212cd8aee666c584460ab27a924ff24d241c))

## [0.2.7](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.6...gensx-v0.2.7) (2025-01-28)


### 🐛 Bug Fixes

* Fix stream component type inference in child functions ([#198](https://github.com/gensx-inc/gensx/issues/198)) ([9b22035](https://github.com/gensx-inc/gensx/commit/9b220357798ec931bcdb2437bafc0cc74c234779))

## [0.2.6](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.5...gensx-v0.2.6) (2025-01-28)


### ✨ New Features

* Add secrets masking ([#182](https://github.com/gensx-inc/gensx/issues/182)) ([17826a7](https://github.com/gensx-inc/gensx/commit/17826a784eccb1641d05fe38a0ee7886a771e019))
* adding deep research example ([#110](https://github.com/gensx-inc/gensx/issues/110)) ([d7c33f2](https://github.com/gensx-inc/gensx/commit/d7c33f2bcad706777bd35a64823ae50b3c0cf914))
* adding support for generic arrays in gsx.array ([#173](https://github.com/gensx-inc/gensx/issues/173)) ([3d8795a](https://github.com/gensx-inc/gensx/commit/3d8795a451ca07b845a14a128d7625edbaa7372e))


### 📚 Documentation

* add discord links and update github links ([#179](https://github.com/gensx-inc/gensx/issues/179)) ([a919345](https://github.com/gensx-inc/gensx/commit/a9193453d49034e115152810292900d3caa3f084))

## [0.2.5](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.4...gensx-v0.2.5) (2025-01-22)


### 🐛 Bug Fixes

* Fix checkpoint race condition by handling out of order arrival of nodes ([#170](https://github.com/gensx-inc/gensx/issues/170)) ([13aaab0](https://github.com/gensx-inc/gensx/commit/13aaab003b830374a31511ad70cbdf884cb8c8e9))

## [0.2.4](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.3...gensx-v0.2.4) (2025-01-22)


### ✨ New Features

* Add `gsx.array` plus `map`, `filter`, `reduce`, and `flatMap` ([#153](https://github.com/gensx-inc/gensx/issues/153)) ([ad8f74b](https://github.com/gensx-inc/gensx/commit/ad8f74b0500ab8b6190334bae396a18655041b6f))
* Add checkpoint support for StreamComponent ([#155](https://github.com/gensx-inc/gensx/issues/155)) ([830f43e](https://github.com/gensx-inc/gensx/commit/830f43ea2b63f11639f911a258a75ca55e5dabe2))

## [0.2.3](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.2...gensx-v0.2.3) (2025-01-21)


### ✨ New Features

* Add checkpointing ([#143](https://github.com/gensx-inc/gensx/issues/143)) ([645d537](https://github.com/gensx-inc/gensx/commit/645d53707efc50a7f8cf5426982cd7d269d92255))
* Add support for component names ([#120](https://github.com/gensx-inc/gensx/issues/120)) ([cc5d69c](https://github.com/gensx-inc/gensx/commit/cc5d69c7c3d39f60ea85db351e445a6b1d3ef47b))
* Implement `createContext` and `useContext` ([#90](https://github.com/gensx-inc/gensx/issues/90)) ([4c30f67](https://github.com/gensx-inc/gensx/commit/4c30f6726c680fdabcf62734eed5035b618b2b17)), closes [#89](https://github.com/gensx-inc/gensx/issues/89)


### 🐛 Bug Fixes

* Update vite-plugin-dts. ([#122](https://github.com/gensx-inc/gensx/issues/122)) ([b831a67](https://github.com/gensx-inc/gensx/commit/b831a670d43b2b089847c8fd244fcd178a2b2afc))

## [0.2.2](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.1...gensx-v0.2.2) (2025-01-10)


### ✨ New Features

* `execute` for sub-workflows. ([#86](https://github.com/gensx-inc/gensx/issues/86)) ([477784a](https://github.com/gensx-inc/gensx/commit/477784a6bb6bc17b99335cd8131457a331507430))


### 🐛 Bug Fixes

* Add apache 2.0 license ([#78](https://github.com/gensx-inc/gensx/issues/78)) ([ca56a98](https://github.com/gensx-inc/gensx/commit/ca56a98760a1c3b9f4db51e464cc95e783523ae4))
* Update jsx-dev-runtime ([#93](https://github.com/gensx-inc/gensx/issues/93)) ([047bfe7](https://github.com/gensx-inc/gensx/commit/047bfe78303d13077678248a126a3904e5c67280))

## [0.2.1](https://github.com/gensx-inc/gensx/compare/gensx-v0.2.0...gensx-v0.2.1) (2025-01-06)


### ✨ New Features

* **@gensx/openai:** Initial commit ([30a1f1a](https://github.com/gensx-inc/gensx/commit/30a1f1ab6f2ed40288e5179aa2babb2b64b9e9ed))
* Implement OpenAI helper ([#47](https://github.com/gensx-inc/gensx/issues/47)) ([df6856b](https://github.com/gensx-inc/gensx/commit/df6856b6f79afbb96e9da4cc261f4ae49ad37c66))
* Improve the streaming API ([#41](https://github.com/gensx-inc/gensx/issues/41)) ([d47ebf4](https://github.com/gensx-inc/gensx/commit/d47ebf4d9d1172a16dba57f01f833df9c5699e84))


### 🐛 Bug Fixes

* **gensx:** Remove openai dependency. ([30a1f1a](https://github.com/gensx-inc/gensx/commit/30a1f1ab6f2ed40288e5179aa2babb2b64b9e9ed))


### 📚 Documentation

* Fix readme for GenSX and the repo ([#51](https://github.com/gensx-inc/gensx/issues/51)) ([ccde311](https://github.com/gensx-inc/gensx/commit/ccde3118018831fd32f097d9d7ecf09bf63b5d99))

## [0.2.0](https://github.com/gensx-inc/gensx/compare/v0.1.1...v0.2.0) (2024-12-31)

### ✨ New Features

- Add some basic documentation to the README. ([#23](https://github.com/gensx-inc/gensx/issues/23)) ([de6c2ec](https://github.com/gensx-inc/gensx/commit/de6c2ec393f33463d3984983ce715136a26e0f4e))
- Framework overhaul - object returns, JSX objects, streaming pattern, and context API ([#36](https://github.com/gensx-inc/gensx/issues/36)) ([196b0e5](https://github.com/gensx-inc/gensx/commit/196b0e501d474db85977aa2bc2f71d5e6b81c46d))

### 🐛 Bug Fixes

- **deps:** bump @rollup/rollup-linux-x64-gnu from 4.28.1 to 4.29.1 ([#25](https://github.com/gensx-inc/gensx/issues/25)) ([969fc36](https://github.com/gensx-inc/gensx/commit/969fc369bcdfee2c6b92ac8f965e02c515cc28c3))
- **deps:** bump @swc/core-linux-x64-gnu from 1.10.1 to 1.10.4 ([#34](https://github.com/gensx-inc/gensx/issues/34)) ([14d0b3d](https://github.com/gensx-inc/gensx/commit/14d0b3dc15b3f9c31b75d0a4dcc80bd22459ec7a))

## [0.1.1](https://github.com/gensx-inc/gensx/compare/v0.1.0...v0.1.1) (2024-12-20)

### 🐛 Bug Fixes

- remove @types/react dep. ([500ab88](https://github.com/gensx-inc/gensx/commit/500ab88368c50dc6629bcdcb1f58891d12e5fe94))
- Tweak the example in README.md ([0498f60](https://github.com/gensx-inc/gensx/commit/0498f6095fccd7b3d56d949c36f726356c046fb7))

## [0.1.0](https://github.com/gensx-inc/gensx/compare/v0.0.1...v0.1.0) (2024-12-20)

### ✨ New Features

- Custom JSX runtime ([#20](https://github.com/gensx-inc/gensx/issues/20)) ([14d417c](https://github.com/gensx-inc/gensx/commit/14d417caa57256cc5117b3e707a311d55ea8d564))

### 🐛 Bug Fixes

- **deps:** bump react, react-dom and @types/react ([#7](https://github.com/gensx-inc/gensx/issues/7)) ([95eaa2b](https://github.com/gensx-inc/gensx/commit/95eaa2b8d8c43720c482412e6ac13ec92e6699ad))

## Changelog
