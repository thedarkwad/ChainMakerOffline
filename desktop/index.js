// desktop/index.js
import { initRemix } from "../remix-electron/dist/index.cjs"
import { app, BrowserWindow, dialog, ipcMain } from "electron"
import electron from "electron"
import { join } from "node:path"
import { save, saveWarning, tempImagesPath } from "./chainManagement.js"
import { chain, load, createNewChain, currentVersion, deleteImages } from "./chainManagement.js"
import { resourcesPath } from "node:process"

app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

/** @type {BrowserWindow} */
let win;
/** @type {"save" || "save-as" || ""} */
let pendingSave = "";

const __dirname = import.meta.dirname;

let dev = false;

app.on("ready", async () => {
  try {
    const url = await initRemix({
      publicFolder: join(dev ? __dirname : process.resourcesPath, dev ? "../public" : "./public"),
      serverBuild: "file://" + join(__dirname, "../build/index.cjs").replaceAll("\\", "/"),
      mode: "production",
      /** @type {import("~/context").LoadContext} */
      getLoadContext: () => ({
        chain: chain.current,
        currentVersion: currentVersion,
        tempImagesPath: tempImagesPath
      }),
      altFilePrefix: "/user_images",
      altPublicFolder: tempImagesPath,
      altURLTransformer: (s) => {
        console.log(s);
        return `/${s.split("/").pop()}`
      }
    });

    win = new BrowserWindow({
      height: 900,
      width: 1200,
      minWidth: 350,
      icon: join(__dirname, "../public/icon.ico"),
      show: false, webPreferences: {
        nodeIntegration: true,
        preload: join(__dirname, "../desktop/preload.cjs")
      }
    });

    if (dev)
      win.webContents.toggleDevTools();


    await win.loadURL(url);

    let updateSettings = (settings) => win.webContents.send("update-settings", settings);
    let themes = [["Arctic", "blue"], ["Lavender", "lavender"], ["Autumn", "autumn"], ["Neon", "neon"]];
    let scales = [["Smallest", 0.8], ["Small", 0.9], ["Normal", 1], ["Large", 1.1], ["Largest", 1.2]];
    let settings = JSON.parse(await win.webContents.executeJavaScript('localStorage.getItem("settings");', true)) 
    || { autosave: true, theme: "neon", fontSize: 1, imperialUnits: true, compact: false };

    let menu = electron.Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          {
            label: 'New Chain',
            accelerator: 'CommandOrControl+N',
            click: async function () {
              await createNewChain(win)
            }
          },
          {
            label: 'Open Chain',
            accelerator: 'CommandOrControl+O',
            click: async () => {
              await load(win);
            }
          },
          { type: 'separator' },
          {
            label: 'Save Chain',
            accelerator: 'CommandOrControl+S',
            click: function () {
              pendingSave = "save";
              win.webContents.send("request-chain", chain);
            }
          },
          {
            label: 'Save Chain As',
            accelerator: 'Shift+CommandOrControl+S',
            click: function () {
              pendingSave = "save-as";
              win.webContents.send("request-chain", chain);
            }
          },
          { type: 'separator' },
          {
            label: 'Exit Chain',
            click: async () => {
              if (!saveWarning()) return;
              chain.current = undefined;
              await deleteImages();
              await win.loadURL(url);
            }
          },
          {
            role: "close"
          },
        ]
      }, {
        label: 'Export',
        click: () => {
          win.webContents.send("request-export");
        }
      }, {
        label: 'View',
        submenu: [
          { role: 'togglefullscreen' }
        ]
      }, {
        label: 'Preferences',
        submenu: [
          {
            label: 'Theme',
            submenu: themes.map(([name, key]) => {
              return {
                label: name,
                click: function () {
                  updateSettings({ theme: key });
                },
                checked: settings.theme == key,
                type: "radio"
              };
            })
          },
          {
            label: 'Unit System',
            submenu: [
              {
                label: 'Imperial',
                click: function () {
                  updateSettings({ imperialUnits: true });
                },
                checked: settings.imperialUnits,
                type: "radio"
              },
              {
                label: 'Metric',
                click: function () {
                  updateSettings({ imperialUnits: false });
                },
                checked: !settings.imperialUnits,
                type: "radio"
              },


            ]
          },
          { type: "separator" },
          {
            label: "Compact View",
            click: (item) => {
              updateSettings({ compact: item.checked });
            },
            checked: settings.compact,
            type: "checkbox"
          },
          {
            label: "Scale",
            submenu: scales.map(([name, key]) => {
              return {
                label: name,
                click: function () {
                  updateSettings({ fontSize: key });
                },
                checked: settings.fontSize == key,
                type: "radio"
              };
            })
          }

        ]
      }

    ]);

    electron.Menu.setApplicationMenu(menu);

    ipcMain.addListener('update-chain', (event, chainString, refresh = false) => {
      chain.current = chainString;
      if (pendingSave) {
        save(pendingSave == "save-as");
        pendingSave = "";
      }
      if (refresh)
        win.reload();
    });

    ipcMain.addListener('request-open', async () => {
      await load(win);
    });


    ipcMain.addListener('request-new', async (event, formData) => {
      await createNewChain(win, formData)
    });


    win.webContents.on("did-create-window", (window) => {
      window.removeMenu();
    });

    win.on("close", (e) => {
      if (!saveWarning())
        e.preventDefault();
    });

    win.show();
  } catch (error) {
    console.error(error)
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  await deleteImages();
})