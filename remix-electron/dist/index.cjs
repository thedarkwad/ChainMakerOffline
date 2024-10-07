"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.mts
var src_exports = {};
__export(src_exports, {
  initRemix: () => initRemix
});
module.exports = __toCommonJS(src_exports);
var webFetch = __toESM(require("@remix-run/web-fetch"), 1);
var import_promises = require("fs/promises");
var import_node2 = require("@remix-run/node");
var import_electron = require("electron");

// src/as-absolute-path.mts
var import_node_path = __toESM(require("path"), 1);
function asAbsolutePath(filePath, workingDirectory) {
  return import_node_path.default.isAbsolute(filePath) ? filePath : import_node_path.default.join(workingDirectory, filePath);
}

// src/asset-files.mts
var import_node_fs = __toESM(require("fs"), 1);
var import_node_path2 = __toESM(require("path"), 1);
var import_node = require("@remix-run/node");
var import_mime = __toESM(require("mime"), 1);
async function serveAsset(request, publicFolder, altPublicFolder, altFilePrefix, altURLTransformer) {
  const url = new URL(request.url);
  const fullFilePath = !altPublicFolder || !altFilePrefix || !decodeURIComponent(url.pathname).startsWith(altFilePrefix) ? import_node_path2.default.join(publicFolder, decodeURIComponent(url.pathname)) : import_node_path2.default.join(altPublicFolder, altURLTransformer ? altURLTransformer(decodeURIComponent(url.pathname)) : decodeURIComponent(url.pathname));
  if (!fullFilePath.startsWith(publicFolder) && (!altPublicFolder || !fullFilePath.startsWith(altPublicFolder)))
    return;
  const stat = await import_node_fs.default.promises.stat(fullFilePath).catch(() => void 0);
  if (!stat?.isFile())
    return;
  const headers = new Headers();
  const mimeType = import_mime.default.getType(fullFilePath);
  if (mimeType)
    headers.set("Content-Type", mimeType);
  const stream = (0, import_node.createReadableStreamFromReadable)(
    import_node_fs.default.createReadStream(fullFilePath)
  );
  return new Response(stream, {
    headers
  });
}

// src/index.mts
global.File = webFetch.File;
var getDefaultMode = () => import_electron.app.isPackaged ? "production" : process.env.NODE_ENV;
async function initRemix({
  serverBuild: serverBuildOption,
  mode,
  publicFolder: publicFolderOption = "public",
  altPublicFolder,
  altFilePrefix,
  altURLTransformer,
  getLoadContext,
  esm = typeof require === "undefined"
}) {
  const publicFolder = asAbsolutePath(publicFolderOption, process.cwd());
  if (!await (0, import_promises.access)(publicFolder, import_promises.constants.R_OK).then(
    () => true,
    () => false
  )) {
    throw new Error(
      `Public folder ${publicFolder} does not exist. Make sure that the initRemix \`publicFolder\` option is configured correctly.`
    );
  }
  const buildPath = typeof serverBuildOption === "string" ? serverBuildOption : void 0;
  let serverBuild = typeof buildPath === "string" ? (
    /** @type {ServerBuild} */
    await (esm ? import(`${buildPath}?${Date.now()}`) : import(buildPath))
  ) : serverBuildOption;
  await import_electron.app.whenReady();
  import_electron.protocol.handle("http", async (request) => {
    const url = new URL(request.url);
    if (
      // We only want to handle local (Remix) requests to port 80.
      // Requests to other hosts or ports should not be intercepted,
      // this might be the case when an application makes requests to a local service.
      !["localhost", "127.0.0.1"].includes(url.hostname) || url.port && url.port !== "80"
    ) {
      return await fetch(request);
    }
    request.headers.append("Referer", request.referrer);
    try {
      const assetResponse = await serveAsset(request, publicFolder, altPublicFolder, altFilePrefix, altURLTransformer);
      if (assetResponse) {
        return assetResponse;
      }
      const context = await getLoadContext?.(request);
      const handleRequest = (0, import_node2.createRequestHandler)(
        serverBuild,
        mode ?? getDefaultMode()
      );
      return await handleRequest(request, context);
    } catch (error) {
      console.warn("[remix-electron]", error);
      const { stack, message } = toError(error);
      return new Response(`<pre>${stack || message}</pre>`, {
        status: 500,
        headers: { "content-type": "text/html" }
      });
    }
  });
  if ((mode ?? getDefaultMode()) !== "production" && typeof buildPath === "string") {
    void (async () => {
      for await (const _event of (0, import_promises.watch)(buildPath)) {
        if (esm) {
          serverBuild = await import(`${buildPath}?${Date.now()}`);
        } else {
          purgeRequireCache(buildPath);
          serverBuild = require(buildPath);
        }
        await (0, import_node2.broadcastDevReady)(serverBuild);
      }
    })();
  }
  return "http://localhost/";
}
function purgeRequireCache(prefix) {
  for (const key in require.cache) {
    if (key.startsWith(prefix)) {
      delete require.cache[key];
    }
  }
}
function toError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  initRemix
});
//# sourceMappingURL=index.js.map