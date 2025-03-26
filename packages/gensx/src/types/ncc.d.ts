/**
 * From the docs:
 * require('@vercel/ncc')('/path/to/input', {
  // provide a custom cache path or disable caching
  cache: "./custom/cache/path" | false,
  // externals to leave as requires of the build
  externals: ["externalpackage"],
  // directory outside of which never to emit assets
  filterAssetBase: process.cwd(), // default
  minify: false, // default
  sourceMap: false, // default
  assetBuilds: false, // default
  sourceMapBasePrefix: '../', // default treats sources as output-relative
  // when outputting a sourcemap, automatically include
  // source-map-support in the output file (increases output by 32kB).
  sourceMapRegister: true, // default
  watch: false, // default
  license: '', // default does not generate a license file
  target: 'es2015', // default
  v8cache: false, // default
  quiet: false, // default
  debugLog: false // default
}).then(({ code, map, assets }) => {
  console.log(code);
  // Assets is an object of asset file names to { source, permissions, symlinks }
  // expected relative to the output code (if any)
})
 */

declare module "@vercel/ncc" {
  function ncc(
    workflowPath: string,
    options?: {
      cache?: string | false;
      externals?: string[];
      filterAssetBase?: string;
      minify?: boolean;
      sourceMap?: boolean;
      assetBuilds?: boolean;
      sourceMapBasePrefix?: string;
      sourceMapRegister?: boolean;
      watch?: boolean;
      license?: string;
      target?: string;
      v8cache?: boolean;
      quiet?: boolean;
      debugLog?: boolean;
    },
  ): Promise<{ code: string; map: string; assets: string[] }>;

  export default ncc;
}
