import { BrowserWindow, dialog, app } from "electron";
import { promises as fs, createWriteStream, existsSync } from "fs";
import { newChain } from "../js/app/routes/_index.js";
import path from "path";
import { exportChainFragment } from "../js/app/jumpchain/ImportExport.js";
import JSZip from "jszip";

/** @type {current: string | undefined} **/
export const chain = { current: undefined };
export const chainSource = { current: null };

const validFileExtensions = ["jpeg", "jpg", "gif", "png", "webp", "jfif"];
const imageFolder = "user_images";
const imagePathRegex = new RegExp(`^${imageFolder}\/(\\d+)\\.(${validFileExtensions.join("|")})\$`);

export const tempPath = path.join(app.getPath("temp"), "ChainMaker");
export const tempImagesPath = path.join(tempPath, imageFolder);
export const backupPath = path.join(app.getPath("userData"), "backups");

const maximumBackups = 10;

export let currentVersion = 0;

export let cleanUpBackups = async () => {

  try {
    let oldestFileTime = undefined;
    let oldestFile = "";

    let files = await fs.readdir(backupPath);
    if (files.length < maximumBackups)
      return;

    for (const file of await fs.readdir(backupPath)) {
      let fileTime = (await fs.stat(path.join(backupPath, file))).ctime.getMilliseconds;
      if (!oldestFileTime || fileTime < oldestFileTime) {
        oldestFile = file;
        oldestFileTime = fileTime;
      }
    }
    await fs.unlink(path.join(backupPath, oldestFile));
  }
  catch (e) {
    dialog.showErrorBox("Save Failed", String(e));
  }

}

export let deleteImages = async () => {
  try {
    if (!existsSync(tempImagesPath)) return;
    for (const file of await fs.readdir(tempImagesPath)) {
      await fs.unlink(path.join(tempImagesPath, file));
    }
  } catch (e) { console.error(e); }

}


export let saveWarning = () => {
  if (!chain.current)
    return true;
  return !!(dialog.showMessageBoxSync({
    title: "Warning",
    message: "Any unsaved edits will be lost if you continue with this action",
    buttons: ["Cancel", "Ok"]
  }));
}

export let save = async (saveAs) => {
  if (!chain.current) return;
  let partialChain = JSON.parse(chain.current, (key, value) => {
    let allowedKeys = ["altforms", "name", "imageUploaded"];
    if (!allowedKeys.includes(key) && !/^\d*$/g.test(key)) return undefined;
    return value;
  });
  if (!chainSource.current || saveAs) {
    let saveSelection = await dialog.showSaveDialog({
      defaultPath: `${partialChain.name || "[untitled_chain]"}`,
      filters: [
        {
          name: "ChainMaker File With Images",
          extensions: ["chain"],
        },
        {
          name: "ChainMaker JSON",
          extensions: ["json"],
        },
      ],
    });
    chainSource.current = saveSelection.filePath || null;
    if (!chainSource.current)
      return;
  }

  const relativeToBackup = path.relative(backupPath, chainSource.current);
  if (relativeToBackup && !relativeToBackup.startsWith('..') && !path.isAbsolute(relativeToBackup)) {
    dialog.showErrorBox(
      "Cannot Save In This Location",
      "Files in the backup folder are regularly overwritten. Please select another save location.",
    );
    chainSource.current = null;
    save(saveAs);
    return;
  }


  try {
    if (!existsSync(backupPath))
      await fs.mkdir(backupPath, { recursive: true });
    cleanUpBackups();
    let isJSON = chainSource.current.split(".").pop().toLowerCase() != "chain";
    let backupFile = path.join(backupPath, partialChain.name + String(Date.now() % 10000) + (isJSON ? ".json" : ".chain"));
    if (isJSON) {
      await fs.writeFile(chainSource.current, chain.current);
      await fs.writeFile(backupFile, chain.current);
    }
    else {
      var outputZip = new JSZip();
      outputZip.file("data.json", chain.current);
      if (existsSync(tempImagesPath)) {
        let altFormsWithImages = Object.keys(partialChain.altforms).filter((id) => !!partialChain.altforms[id].imageUploaded);
        for (const file of await fs.readdir(tempImagesPath)) {
          if (!validFileExtensions.includes(file.split(".").pop().toLowerCase()))
            continue;
          if (!altFormsWithImages.includes(path.parse(file).name))
            continue;
          outputZip.folder(imageFolder).file(file, await fs.readFile(path.join(tempImagesPath, file)))
        }
      }
      outputZip.generateNodeStream().pipe(createWriteStream(chainSource.current));
      outputZip.generateNodeStream().pipe(createWriteStream(backupFile));
    }
  } catch (e) {
    console.log(e);
    dialog.showErrorBox("Save Failed", "Save failed for unknown reason. Please try again.");
  }
}

/** @type {(win: BrowserWindow, path: string) => Promise<void>} */
export let load = async (win, customPath = "") => {
  if (!saveWarning()) return;
  let fileSelection = await dialog.showOpenDialog({
    properties: ['openFile'], filters: [
      { name: 'ChainMaker Files', extensions: ['json', 'chain'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...(customPath ? { defaultPath: customPath } : {})
  });

  if (!fileSelection.filePaths.length) return;
  let newSource = fileSelection.filePaths[0];

  try {
    let fileExtension = newSource.split(".").pop().toLowerCase();
    let file;
    switch (fileExtension) {
      case "json":
        file = await fs.readFile(newSource, { encoding: "utf8" });
        app.addRecentDocument(newSource);
        chain.current = file;
        break;
      case "chain":
        let zipFile = await JSZip.loadAsync(await fs.readFile(newSource));
        let jsonFile = zipFile.file("data.json");
        if (!jsonFile)
          throw new Error();
        if (!existsSync(tempImagesPath))
          await fs.mkdir(tempImagesPath, { recursive: true })
        chain.current = await jsonFile.async("string");
        Object.keys(zipFile.files).forEach(async (fileName) => {
          if (!imagePathRegex.test(fileName)) {
            if (fileName != "data.json" && fileName != imageFolder + "/") {
              dialog.showErrorBox("Warning. Suspcious file contents detected.",
                "It appears that this .chain file contains additional data of an unknown structure. Please be wary.");
            }
            return;
          }
          zipFile.files[fileName].nodeStream().pipe(createWriteStream(path.join(tempPath, fileName)));
        }
        )
        break;
      default:
        dialog.showErrorBox("Open Failed", "Invalid File Type.");
        return;
    }

    chainSource.current = customPath ? null : newSource;
    currentVersion++;
    win.webContents.reload();
  } catch (e) {
    console.log(e);
    dialog.showErrorBox("Open Failed", "Unknown error while opening chain.");
  }
}

export let createNewChain = async (win, body = {}) => {
  if (!saveWarning()) return;
  let formData = new FormData();
  formData.append("title", body.title || "[untitled chain]");
  formData.append("jumper", body.jumper || "Jumper");
  formData.append("jump", body.jump || "[untitled jump]");
  formData.append("jumpURL", body.jumpURL || "");
  formData.append("warehouseMod", body.warehouseMod || "0");
  formData.append("bodyMod", body.bodyMod || "0");
  chain.current = exportChainFragment(newChain(formData));
  chainSource.current = null;
  currentVersion++;
  win.webContents.reload();
}