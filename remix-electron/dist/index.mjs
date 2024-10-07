var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/index.mts
import * as webFetch from "@remix-run/web-fetch";
import { constants, access, watch } from "node:fs/promises";
import { broadcastDevReady, createRequestHandler } from "@remix-run/node";
import { app, protocol } from "electron";

// src/as-absolute-path.mts
import path from "node:path";
function asAbsolutePath(filePath, workingDirectory) {
  return path.isAbsolute(filePath) ? filePath : path.join(workingDirectory, filePath);
}

// src/asset-files.mts
import fs from "node:fs";
import path2 from "node:path";
import { createReadableStreamFromReadable } from "@remix-run/node";
import mime from "mime";
async function serveAsset(request, publicFolder, altPublicFolder, altFilePrefix, altURLTransformer) {
  const url = new URL(request.url);
  const fullFilePath = !altPublicFolder || !altFilePrefix || !decodeURIComponent(url.pathname).startsWith(altFilePrefix) ? path2.join(publicFolder, decodeURIComponent(url.pathname)) : path2.join(altPublicFolder, altURLTransformer ? altURLTransformer(decodeURIComponent(url.pathname)) : decodeURIComponent(url.pathname));
  if (!fullFilePath.startsWith(publicFolder) && (!altPublicFolder || !fullFilePath.startsWith(altPublicFolder)))
    return;
  const stat = await fs.promises.stat(fullFilePath).catch(() => void 0);
  if (!stat?.isFile())
    return;
  const headers = new Headers();
  const mimeType = mime.getType(fullFilePath);
  if (mimeType)
    headers.set("Content-Type", mimeType);
  const stream = createReadableStreamFromReadable(
    fs.createReadStream(fullFilePath)
  );
  return new Response(stream, {
    headers
  });
}

// src/index.mts
global.File = webFetch.File;
var getDefaultMode = () => app.isPackaged ? "production" : process.env.NODE_ENV;
async function initRemix({
  serverBuild: serverBuildOption,
  mode,
  publicFolder: publicFolderOption = "public",
  altPublicFolder,
  altFilePrefix,
  altURLTransformer,
  getLoadContext,
  esm = typeof __require === "undefined"
}) {
  const publicFolder = asAbsolutePath(publicFolderOption, process.cwd());
  if (!await access(publicFolder, constants.R_OK).then(
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
  await app.whenReady();
  protocol.handle("http", async (request) => {
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
      const handleRequest = createRequestHandler(
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
      for await (const _event of watch(buildPath)) {
        if (esm) {
          serverBuild = await import(`${buildPath}?${Date.now()}`);
        } else {
          purgeRequireCache(buildPath);
          serverBuild = __require(buildPath);
        }
        await broadcastDevReady(serverBuild);
      }
    })();
  }
  return "http://localhost/";
}
function purgeRequireCache(prefix) {
  for (const key in __require.cache) {
    if (key.startsWith(prefix)) {
      delete __require.cache[key];
    }
  }
}
function toError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
export {
  initRemix
};
//# sourceMappingURL=index.mjs.map