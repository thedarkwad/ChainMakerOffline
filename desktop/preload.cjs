const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onChainRequest: (func) => {
    ipcRenderer.removeAllListeners("request-chain");
    ipcRenderer.on("request-chain", func);
  },
  onSettingsUpdate: (func) => {
    ipcRenderer.removeAllListeners("update-settings");
    ipcRenderer.on("update-settings", (e, d) => func(d));
  },
  updateChain: (string) => {ipcRenderer.send("update-chain", string);},
  onRequestExport: (func) => {
    ipcRenderer.removeAllListeners("request-export");
    ipcRenderer.on("request-export", func);
  },
  requestOpen: () => {ipcRenderer.send("request-open");},
  requestNew: (f) => {ipcRenderer.send("request-new", f);}   
});
