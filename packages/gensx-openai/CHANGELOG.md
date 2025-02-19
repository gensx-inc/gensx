# Changelog

## [0.1.7](https://github.com/gensx-inc/gensx/compare/gensx-openai-v0.1.6...gensx-openai-v0.1.7) (2025-02-19)


### ✨ New Features

* Add `workflow.run` for executing workflows in a fresh context ([#255](https://github.com/gensx-inc/gensx/issues/255)) ([62c5f19](https://github.com/gensx-inc/gensx/commit/62c5f19ef142ab1d0d76531c9caa0d8688cfae4d))
* CLI Device auth flow ([#212](https://github.com/gensx-inc/gensx/issues/212)) ([094b98e](https://github.com/gensx-inc/gensx/commit/094b98e12ef4239e8b04c176a14f19f5e891f5a1))
* first round of tool updates ([#251](https://github.com/gensx-inc/gensx/issues/251)) ([5970487](https://github.com/gensx-inc/gensx/commit/59704877ae75874fd886e0ef36fe64d18eb6bb1e))
* Improving Visualization for GSXChatCompletion ([#258](https://github.com/gensx-inc/gensx/issues/258)) ([01b7b52](https://github.com/gensx-inc/gensx/commit/01b7b5277c4ed177338ca3e63327401a51e1e927))
* make GSXChatCompletion return the entire messages array.  ([#262](https://github.com/gensx-inc/gensx/issues/262)) ([240f2b6](https://github.com/gensx-inc/gensx/commit/240f2b6319ad38c3a9692b72f03164ef04fece6c))
* Removing GSXSchema, updating docs, and updating example ([#242](https://github.com/gensx-inc/gensx/issues/242)) ([1a54078](https://github.com/gensx-inc/gensx/commit/1a5407869fd0e7ca2f428f8d36c3696e50edcc28))
* renaming tool.execute to tool.run ([#275](https://github.com/gensx-inc/gensx/issues/275)) ([37adf90](https://github.com/gensx-inc/gensx/commit/37adf90c78e9ca7cac3eb566eca17961086d8895))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * gensx bumped to 0.2.11
  * devDependencies
    * gensx bumped to 0.2.11

## [0.1.6](https://github.com/gensx-inc/gensx/compare/gensx-openai-v0.1.5...gensx-openai-v0.1.6) (2025-02-13)


### ✨ New Features

* GSXChatCompletion to support structured output, tools, streaming, and the complete matrix of overlap ([#237](https://github.com/gensx-inc/gensx/issues/237)) ([372c04f](https://github.com/gensx-inc/gensx/commit/372c04f1ee4681beeb8643c027f75616deb6b3c4))

## [0.1.5](https://github.com/gensx-inc/gensx/compare/gensx-openai-v0.1.4...gensx-openai-v0.1.5) (2025-01-29)


### 🐛 Bug Fixes

* update secret component opts for openAI provider ([#200](https://github.com/gensx-inc/gensx/issues/200)) ([f913e9e](https://github.com/gensx-inc/gensx/commit/f913e9e6d8a46066e02f3653f5897e2e0864449c))

## [0.1.4](https://github.com/gensx-inc/gensx/compare/gensx-openai-v0.1.3...gensx-openai-v0.1.4) (2025-01-28)


### ✨ New Features

* Add secrets masking ([#182](https://github.com/gensx-inc/gensx/issues/182)) ([17826a7](https://github.com/gensx-inc/gensx/commit/17826a784eccb1641d05fe38a0ee7886a771e019))


### 📚 Documentation

* add discord links and update github links ([#179](https://github.com/gensx-inc/gensx/issues/179)) ([a919345](https://github.com/gensx-inc/gensx/commit/a9193453d49034e115152810292900d3caa3f084))

## [0.1.3](https://github.com/gensx-inc/gensx/compare/gensx-openai-v0.1.2...gensx-openai-v0.1.3) (2025-01-21)


### ✨ New Features

* Add support for component names ([#120](https://github.com/gensx-inc/gensx/issues/120)) ([cc5d69c](https://github.com/gensx-inc/gensx/commit/cc5d69c7c3d39f60ea85db351e445a6b1d3ef47b))
* Implement `createContext` and `useContext` ([#90](https://github.com/gensx-inc/gensx/issues/90)) ([4c30f67](https://github.com/gensx-inc/gensx/commit/4c30f6726c680fdabcf62734eed5035b618b2b17)), closes [#89](https://github.com/gensx-inc/gensx/issues/89)


### 🐛 Bug Fixes

* Update vite-plugin-dts. ([#122](https://github.com/gensx-inc/gensx/issues/122)) ([b831a67](https://github.com/gensx-inc/gensx/commit/b831a670d43b2b089847c8fd244fcd178a2b2afc))

## [0.1.2](https://github.com/gensx-inc/gensx/compare/gensx-openai-v0.1.1...gensx-openai-v0.1.2) (2025-01-11)


### 🐛 Bug Fixes

* Add apache 2.0 license ([#78](https://github.com/gensx-inc/gensx/issues/78)) ([ca56a98](https://github.com/gensx-inc/gensx/commit/ca56a98760a1c3b9f4db51e464cc95e783523ae4))

## [0.1.1](https://github.com/gensx-inc/gensx/compare/gensx-openai-v0.1.0...gensx-openai-v0.1.1) (2025-01-07)


### 🐛 Bug Fixes

* fix peer dependency for gensx-openai. ([5900765](https://github.com/gensx-inc/gensx/commit/59007651abaf2abc5840495758627c399c501e17))

## 0.1.0 (2025-01-07)


### ✨ New Features

* **@gensx/openai:** Initial commit ([30a1f1a](https://github.com/gensx-inc/gensx/commit/30a1f1ab6f2ed40288e5179aa2babb2b64b9e9ed))
* Implement OpenAI helper ([#47](https://github.com/gensx-inc/gensx/issues/47)) ([df6856b](https://github.com/gensx-inc/gensx/commit/df6856b6f79afbb96e9da4cc261f4ae49ad37c66))
* Improve the streaming API ([#41](https://github.com/gensx-inc/gensx/issues/41)) ([d47ebf4](https://github.com/gensx-inc/gensx/commit/d47ebf4d9d1172a16dba57f01f833df9c5699e84))


### 🐛 Bug Fixes

* **gensx:** Remove openai dependency. ([30a1f1a](https://github.com/gensx-inc/gensx/commit/30a1f1ab6f2ed40288e5179aa2babb2b64b9e9ed))

## 0.0.0 (Initial Release)

- Initial release of @gensx/openai
