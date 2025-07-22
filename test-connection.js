// A test script for WhatsApp connection
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

// Constants
const MAX_RETRIES = 10;
let connectionRetryCount = 0;
let sock = null;
let qrCodeData = null;
let isAuthenticated = false;

// Define backup connection configuration options
const backupConnectionOptions = [
  {
    browser: ["Chrome (Windows)", "Chrome", "10.0"],
    version: [2, 2323, 4],
  },
  {
    browser: ["Firefox (Windows)", "Firefox", "15.0"],
    version: [2, 2323, 4],
  },
  {
    browser: ["WhatsApp Desktop (Windows)", "Desktop", "1.0"],
    version: [2, 2246, 9],
  },
  {
    browser: ["Chrome (Linux)", "Chrome", "10.0"],
    version: [2, 2322, 15],
  },
  {
    browser: ["Chrome (MacOS)", "Chrome", "10.0"],
    version: [2, 2308, 7],
  },
];

// Track which backup config we're using
let currentBackupConfigIndex = -1; // -1 means using default config

async function connectToWhatsApp() {
  try {
    qrCodeData = null;
    isAuthenticated = false;

    // Create auth folder if it doesn't exist
    const authFolder = path.join(__dirname, "wa-auth");
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
      console.log(`Created auth folder: ${authFolder}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // Determine which connection config to use based on retry count
    let connectionOptions = {
      auth: state,
      printQRInTerminal: false, // We'll handle QR display manually
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      syncFullHistory: false,
      retryRequestDelayMs: 1000,
      markOnlineOnConnect: false,
    };

    // If we've had connection failures, try a different browser fingerprint
    if (connectionRetryCount > 1) {
      // Rotate through backup configs
      currentBackupConfigIndex =
        (currentBackupConfigIndex + 1) % backupConnectionOptions.length;
      const backupConfig = backupConnectionOptions[currentBackupConfigIndex];

      console.log(
        `Trying backup connection configuration #${
          currentBackupConfigIndex + 1
        }`
      );
      console.log(`- Browser: ${backupConfig.browser.join(", ")}`);
      console.log(
        `- Version: ${
          backupConfig.version ? backupConfig.version.join(".") : "auto"
        }`
      );

      connectionOptions = {
        ...connectionOptions,
        ...backupConfig,
      };
    } else {
      // Use default config
      connectionOptions.browser = ["Chrome (Windows)", "Chrome", "10.0"];
      connectionOptions.version = [2, 2323, 4]; // Always specify a version
      currentBackupConfigIndex = -1;
      console.log("Using default connection configuration");
    }

    // Create socket
    sock = makeWASocket(connectionOptions);

    // Save credentials on update
    sock.ev.on("creds.update", saveCreds);

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR code generation
      if (qr) {
        try {
          qrCodeData = qr;
          console.log("\n📱 Scan this QR Code to Connect:");
          qrcode.generate(qr, { small: true });
        } catch (qrError) {
          console.error("Error generating QR code:", qrError);
        }
      }

      // Handle successful connection
      if (connection === "open") {
        isAuthenticated = true;
        connectionRetryCount = 0; // Reset retry counter on successful connection
        console.log("✅ WhatsApp Connected Successfully!");
        console.log(
          `Currently connected with ${sock.user?.name || "Unknown User"}`
        );

        // Print the configuration that worked
        const usedConfig =
          currentBackupConfigIndex === -1
            ? "Default"
            : `Backup #${currentBackupConfigIndex + 1}`;
        console.log(`Connection successful with configuration: ${usedConfig}`);
      }
      // Handle disconnection
      else if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason =
          lastDisconnect?.error?.output?.payload?.error || "Unknown";
        console.log(
          `❌ WhatsApp Disconnected - Status: ${statusCode}, Reason: ${reason}`
        );

        isAuthenticated = false;

        // Handle different disconnect scenarios
        if (statusCode === DisconnectReason.loggedOut) {
          console.log("User logged out - clearing auth data");
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }
          connectionRetryCount = 0; // Reset counter as user needs to re-login
        } else if (statusCode === 401 || statusCode === 403) {
          // Auth issues - try clearing creds and reconnecting
          console.log(
            `Authentication error (${statusCode}) - clearing auth data and retrying`
          );
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }

          if (connectionRetryCount < MAX_RETRIES) {
            connectionRetryCount++;
            console.log(
              `Reconnecting after auth error (attempt ${connectionRetryCount}/${MAX_RETRIES})...`
            );
            setTimeout(connectToWhatsApp, 3000); // Wait 3 seconds before retrying
          } else {
            console.log("Max connection retries reached after auth errors");
            connectionRetryCount = 0; // Reset for next user attempt
          }
        } else if (statusCode === 405) {
          console.log(
            "Received 405 Method Not Allowed error - this is likely due to a WhatsApp API change"
          );
          console.log(
            "Will attempt to connect with different browser/version fingerprints"
          );

          // For 405 errors, always try a different browser fingerprint
          if (connectionRetryCount < MAX_RETRIES) {
            connectionRetryCount++;
            const delay = Math.min(1000 * 2 ** connectionRetryCount, 15000);
            console.log(
              `Reconnecting in ${
                delay / 1000
              }s (attempt ${connectionRetryCount}/${MAX_RETRIES})...`
            );
            setTimeout(connectToWhatsApp, delay);
          } else {
            console.log("Max connection retries reached after 405 errors");
            connectionRetryCount = 0; // Reset for next user attempt
          }
        } else {
          // General reconnection for other errors
          if (connectionRetryCount < MAX_RETRIES) {
            connectionRetryCount++;
            const delay = Math.min(1000 * 2 ** connectionRetryCount, 30000); // Exponential backoff with 30s max
            console.log(
              `Reconnecting in ${
                delay / 1000
              }s (attempt ${connectionRetryCount}/${MAX_RETRIES})...`
            );
            setTimeout(connectToWhatsApp, delay);
          } else {
            console.log("Max connection retries reached");
            connectionRetryCount = 0;
          }
        }
      }
    });

    // Setup message event handlers
    sock.ev.on("messages.upsert", async (messageInfo) => {
      console.log("Received message update:", messageInfo.type);
    });
  } catch (err) {
    console.error("Failed to connect to WhatsApp:", err);
    if (connectionRetryCount < MAX_RETRIES) {
      connectionRetryCount++;
      const delay = Math.min(1000 * 2 ** connectionRetryCount, 30000);
      console.log(
        `Error during setup, reconnecting in ${
          delay / 1000
        }s (attempt ${connectionRetryCount}/${MAX_RETRIES})...`
      );
      setTimeout(connectToWhatsApp, delay);
    } else {
      console.log("Max connection retries reached during setup");
      connectionRetryCount = 0;
    }
  }
}

console.log("Starting WhatsApp connection test...");
console.log(
  "This script will attempt to connect to WhatsApp Web using various browser configurations"
);
console.log("If you see a QR code, scan it with your phone to authenticate");

// Start connection
connectToWhatsApp();
