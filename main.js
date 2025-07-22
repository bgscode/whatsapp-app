// main.js (or electron.js)
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  Notification,
} = require("electron");
const path = require("path");
const fs = require("fs");
const server = require("./server"); // ensure your server file is correctly referenced
const checkPortInUse = require("./controller/checkPortInUse");

let PORT = 5000;
let mainWindow;
let tray;
const dataFilePath = path.join(app.getPath("userData"), "user-data.json");

// -------------------- Single Instance Lock --------------------
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
    }
  });
}

// -------------------- User Data Helpers --------------------
function saveUserData(key, value) {
  let data = {};
  if (fs.existsSync(dataFilePath)) {
    data = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
  }
  data[key] = value;
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

function loadUserData(key) {
  if (!fs.existsSync(dataFilePath)) return null;
  const data = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
  return data[key];
}

// -------------------- Create Main Window --------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, "/assets/icons/png/64x64.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Hide menu bar on Windows/Linux (macOS dock remains visible by default)
  mainWindow.menuBarVisible = false;

  // Load your Vite/React app
  mainWindow.loadURL(`http://localhost:${PORT}`);
  // mainWindow.loadURL("http://localhost:5173");
  // mainWindow.webContents.openDevTools();

  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(__dirname, "assets/icons/mac/icon.icns"));
  }

  // Create an application menu with Zoom In / Zoom Out etc.
  const menuTemplate = [
    {
      label: "View",
      submenu: [
        {
          label: "Zoom In",
          accelerator: "CommandOrControl+=", // Ctrl + = on Win/Linux, Cmd + = on macOS
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
          },
        },
        {
          label: "Zoom Out",
          accelerator: "CommandOrControl+-", // Ctrl + - on Win/Linux, Cmd + - on macOS
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
          },
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Tray",
      submenu: [
        {
          label: "Show App",
          click: () => mainWindow.show(),
        },
        {
          label: "Quit",
          click: quitApp,
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Setup the tray icon
  tray = new Tray(path.join(__dirname, "/assets/icons/png/24x24.png"));
  const trayMenu = Menu.buildFromTemplate([
    { label: "Show App", click: () => mainWindow.show() },
    { label: "Quit", click: quitApp },
  ]);
  tray.setToolTip("WhatsApp Automation");
  tray.setContextMenu(trayMenu);

  // Minimize to Tray on window close (instead of quitting)
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Restore App when tray icon is clicked
  tray.on("click", () => {
    mainWindow.show();
  });
}

// -------------------- Quit App Helper --------------------
function quitApp() {
  app.isQuiting = true;
  app.quit();
}

// -------------------- App Events --------------------
app.whenReady().then(async () => {
  // 1. Check if the port is already in use (must await the Promise)
  const portInUse = await checkPortInUse(PORT);

  if (portInUse) {
    console.log(`Port ${PORT} is already in use. Skipping server startup.`);
    createWindow();
    mainWindow.show();
  } else {
    // 3. If the port is free, start the server and create the window
    server.app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      createWindow();
      // Optionally, on macOS hide the dock icon for a tray-only app
      if (process.platform === "darwin") {
        app.dock.hide();
      }
    });
  }

  // Re-open window when app is activated (e.g., dock icon clicked on macOS)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// On Windows/Linux, quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    quitApp();
  }
});

// -------------------- IPC Handlers --------------------
ipcMain.handle("storage-get", (event, key) => {
  return loadUserData(key);
});

ipcMain.handle("storage-set", (event, key, value) => {
  return saveUserData(key, value);
});

ipcMain.handle("notification", (_, title, message) => {
  new Notification({ title, body: message }).show();
});
