// 📁 Preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getData: (key) => ipcRenderer.invoke("storage-get", key), // Pass the `key`
  setData: (key, value) => ipcRenderer.invoke("storage-set", key, value), // Pass both `key` and `value`
  sendNotification: (title, message) =>
    ipcRenderer.invoke("notification", title, message), // Pass both `title` and `message`
});
