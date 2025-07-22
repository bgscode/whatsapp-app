// server.js
const express = require("express");
const { app: electronApp } = require("electron");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const qrcode = require("qrcode");
const sqlite3 = require("sqlite3").verbose();
const cron = require("node-cron");
const os = require("os");
const { machineIdSync } = require("node-machine-id");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

// Routers (assumed implemented)
const FilesRouter = require("./controller/files");
const CategoriesRouter = require("./controller/categories");
const GroupsRouter = require("./controller/groups");
const ContactsRouter = require("./controller/contacts");
const ContactsGroupsRouter = require("./controller/contacts-groups");
const TmeplateRouter = require("./controller/templates");
const SheduleRouter = require("./controller/shedule");
const sendMessage = require("./controller/sendMessage");
const LogsRouter = require("./controller/logs");

// ----------------- LICENSE / VERIFICATION SETUP -----------------
const VERIFY_URL =
  "https://script.google.com/macros/s/AKfycbwyWw7h1gm3MIUPjn8DZ9gDWLH0DhIYr33tuY15quajs6d6ai5niLqIP8zXgPMbM-0o/exec";

// Path for persistent data
const dataFilePath = path.join(
  electronApp.getPath("userData"),
  "user-data.json"
);
function loadUserData() {
  if (!fs.existsSync(dataFilePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
  } catch {
    return {};
  }
}
function saveUserData(key, value) {
  let data = loadUserData();
  data[key] = value;
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// Load persistent fields
let { messageCount = 0, activationCode = "" } = loadUserData();

// In-memory flags and license details
let isVerified = false;
let licenseDetails = {};

// Updated License check function
async function checkLicense() {
  if (!activationCode) {
    isVerified = false;
    licenseDetails = {};
    return;
  }
  try {
    const hwId = machineIdSync();
    const devName = os.hostname();
    const payload = { activationCode, hardwareId: hwId, deviceName: devName };

    let response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let responseText = await response.text();

    let resp;
    try {
      resp = JSON.parse(responseText);
    } catch (error) {
      throw new Error("Invalid JSON response received from the server");
    }

    if (resp && resp.status === "ok") {
      if (resp.planType && resp.planType.toLowerCase() === "lifetime") {
        isVerified = true;
      } else if (resp.expiryDate) {
        const expiry = new Date(resp.expiryDate);
        const now = new Date();
        if (expiry < now) {
          isVerified = false;
        } else {
          isVerified = true;
        }
      } else {
        isVerified = true;
      }
      licenseDetails = {
        token: resp.token,
        devices: resp.devices,
        planType: resp.planType,
        expiryDate:
          resp.planType && resp.planType.toLowerCase() === "lifetime"
            ? ""
            : resp.expiryDate,
        message: resp.message,
      };
      // console.log("License Verified:", licenseDetails);
    } else {
      isVerified = false;
      licenseDetails = {};
      // console.log("License NOT verified:", resp?.message || "Unknown");
    }
  } catch (error) {
    isVerified = false;
    licenseDetails = {};
    console.error("License check error:", error?.message);
  }
}

checkLicense();
setInterval(checkLicense, 60 * 60 * 1000); // re-check every 60 minutes

function canSendMoreMessages() {
  return isVerified ? true : messageCount < 100;
}
function incrementMessageCount() {
  messageCount++;
  saveUserData("messageCount", messageCount);
}

// ----------------- DATABASE SETUP -----------------
const db = new sqlite3.Database("./waboss.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to the waboss database.");
});

db.run("DROP TABLE IF EXISTS groups");
db.run(
  `CREATE TABLE IF NOT EXISTS groups (
    name TEXT NOT NULL,
    group_id TEXT NOT NULL PRIMARY KEY UNIQUE,
    member_phone_no TEXT,
    member_size INTEGER,
    add_permission BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);
db.run(
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);
db.run(
  `CREATE TABLE IF NOT EXISTS contact_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fields TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    whatsapp_no TEXT NOT NULL,
    contact_group_id INTEGER,
    other_fields TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_group_id) REFERENCES contact_groups (id)
  )
`);

db.run(
  `CREATE TABLE IF NOT EXISTS templets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    attachment_document TEXT,
    attachment_thumbnail TEXT,
    category_id INTEGER,
    variables TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`
);

// Updated message_logs table includes "repeat_type"
// db.run("DROP TABLE IF EXISTS message_logs");
db.run(
  `CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    whatsapp_no TEXT NOT NULL,
    contact_type TEXT NOT NULL,
    message TEXT NOT NULL,
    attachment_document TEXT,
    attachment_thumbnail TEXT,
    schedule_date TEXT,
    schedule_time TEXT,
    repeat_type TEXT DEFAULT 'none',
    error_message TEXT,
    status TEXT DEFAULT 'sent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

// Middleware to attach db
const addDb = (req, _, next) => {
  req.db = db;
  next();
};

// ----------------- EXPRESS APP SETUP -----------------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "build")));

const uploadPath = path.join(electronApp.getPath("userData"), "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use("/uploads", express.static(uploadPath));
app.use(cors());

// Load settings from user-data.json or use defaults
let dataFileContent = loadUserData();
if (!dataFileContent.settings) {
  dataFileContent.settings = {
    messagingPreferences: {
      messageGapEnabled: true,
      gapType: "random",
      fixedGap: 3,
      randomGap: { min: 5, max: 20 },
      batchMessagesEnabled: true,
      batchSize: 10,
      batchIntervalType: "random",
      fixedBatchInterval: 30,
      randomBatchInterval: { min: 15, max: 45 },
    },
    notificationPreferences: {
      emailNotifications: true,
      messageDeliveryReports: true,
      campaignCompletion: true,
    },
    selectedCountry: {
      name: "India",
      native: "भारत",
      phone: [91],
      continent: "AS",
      capital: "New Delhi",
      currency: ["INR"],
      languages: ["hi", "en"],
      iso: "IN",
      flag: "https://flagcdn.com/48x36/in.png",
    },
  };
}
app.put("/settings", (req, res) => {
  const { settings } = req.body;
  dataFileContent.settings = settings;
  saveUserData("settings", settings);
  res.json({ status: "Settings updated successfully" });
});
app.post("/reset-settings", (req, res) => {
  const defaultSettings = {
    messagingPreferences: {
      messageGapEnabled: true,
      gapType: "random",
      fixedGap: 3,
      randomGap: { min: 5, max: 20 },
      batchMessagesEnabled: true,
      batchSize: 10,
      batchIntervalType: "random",
      fixedBatchInterval: 30,
      randomBatchInterval: { min: 15, max: 45 },
    },
    notificationPreferences: {
      emailNotifications: true,
      messageDeliveryReports: true,
      campaignCompletion: true,
    },
    selectedCountry: {
      name: "India",
      native: "भारत",
      phone: [91],
      continent: "AS",
      capital: "New Delhi",
      currency: ["INR"],
      languages: ["hi", "en"],
      iso: "IN",
      flag: "https://flagcdn.com/48x36/in.png",
    },
  };
  dataFileContent.settings = defaultSettings;
  saveUserData("settings", defaultSettings);
  res.json({ status: "Settings reset to default" });
});
app.get("/settings", (req, res) => {
  res.json({ settings: dataFileContent.settings });
});

// Helper functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ----------------- WHATSAPP (BAILEYS) SETUP -----------------
const authFolder = path.join(electronApp.getPath("userData"), "WA_auth");
let isAuthenticated = false;
let sock;
let qrCodeBase64 = "";
let connectionRetryCount = 0;
const MAX_RETRIES = 5;

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

const isAuth = (req, res, next) => {
  if (isAuthenticated) next();
  else res.status(401).json({ status: "Not Authenticated" });
};

const syncGroupsToDB = async (groupsData) => {
  try {
    if (!groupsData) {
      if (!sock || !sock.groupFetchAllParticipating) {
        console.log("Cannot sync groups - socket connection not ready");
        return;
      }

      groupsData = await sock.groupFetchAllParticipating();
      console.log(
        "Groups fetched from WhatsApp:",
        Object.keys(groupsData).length
      );
    }

    const groups = Object.values(groupsData);
    console.log(`Syncing ${groups.length} WhatsApp groups to DB...`);

    groups.forEach((group) => {
      const groupId = group.id;
      const groupName = group.subject || "";
      const memberSize = group.size;
      const addPermission =
        group.memberAddMode ||
        group.owner?.split("@")[0] === sock?.user?.id.split(":")[0];
      const allParticipants = group.participants
        ? group.participants.map((p) => p.id).join(",")
        : "";

      db.run(
        `INSERT OR REPLACE INTO groups (name, group_id, member_phone_no, member_size, add_permission, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [groupName, groupId, allParticipants, memberSize, addPermission]
      );
    });
    console.log("Group sync complete.");
  } catch (error) {
    console.error("Error during group sync:", error);
  }
};

const updateGroupInDB = (groupUpdate) => {
  try {
    const groupId = groupUpdate.id;
    if (!groupId) return; // nothing to do

    // Build an array of fields and values if they are present in the update.
    let fields = [];
    let values = [];

    if (groupUpdate.subject !== undefined) {
      fields.push("name = ?");
      values.push(groupUpdate.subject);
    }
    if (groupUpdate.size !== undefined) {
      fields.push("member_size = ?");
      values.push(groupUpdate.size);
    }
    if (groupUpdate.memberAddMode !== undefined) {
      fields.push("add_permission = ?");
      values.push(groupUpdate.memberAddMode);
    }
    // For participants, if provided, update them.
    if (groupUpdate.participants !== undefined) {
      const allParticipants = Array.isArray(groupUpdate.participants)
        ? groupUpdate.participants.map((p) => p.id).join(",")
        : groupUpdate.participants; // in case it's already a string
      fields.push("member_phone_no = ?");
      values.push(allParticipants);
    }

    // Only update if there is something to update.
    if (fields.length > 0) {
      // Always update updated_at to current timestamp.
      fields.push("updated_at = CURRENT_TIMESTAMP");
      // Add groupId for the WHERE clause.
      values.push(groupId);
      const query = `UPDATE groups SET ${fields.join(", ")} WHERE group_id = ?`;
      db.run(query, values, function (err) {
        if (err) {
          console.error("Error updating group:", err);
        } else {
          console.log(`Group ${groupId} updated successfully.`);
        }
      });
    }
  } catch (error) {
    console.error("Error in updateGroupInDB:", error);
  }
};

/**
 * Establishes connection to WhatsApp using Baileys library
 * with improved error handling and reconnection logic
 */
const connectToWhatsApp = async () => {
  try {
    qrCodeBase64 = null;
    isAuthenticated = false;

    // Create auth folder if it doesn't exist
    const authFolder = path.join(electronApp.getPath("userData"), "wa-auth");
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
      console.log(`Created auth folder: ${authFolder}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // Determine which connection config to use based on retry count
    let connectionOptions = {
      auth: state,
      printQRInTerminal: true,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      syncFullHistory: false,
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
      console.log(`- Version: ${backupConfig.version.join(".")}`);

      connectionOptions = {
        ...connectionOptions,
        ...backupConfig,
      };
    } else {
      // Use default config
      connectionOptions.browser = ["Chrome (Windows)", "Chrome", "10.0"];
      connectionOptions.version = [2, 2323, 4];
      currentBackupConfigIndex = -1;
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
          qrCodeBase64 = await qrcode.toDataURL(qr);
          console.log("📱 Scan QR Code to Connect (QR generated successfully)");
        } catch (qrError) {
          console.error("Error generating QR code:", qrError);
        }
      }

      // Handle successful connection
      if (connection === "open") {
        isAuthenticated = true;
        connectionRetryCount = 0; // Reset retry counter on successful connection
        console.log("✅ WhatsApp Connected Successfully");

        // Try syncing groups after successful connection
        try {
          await syncGroupsToDB();
        } catch (syncError) {
          console.error("Error syncing groups after connection:", syncError);
        }
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

        // Special handling for 405 Method Not Allowed - WhatsApp API changes
        if (statusCode === 405) {
          console.log(
            "Received 405 Method Not Allowed error - this is likely due to a WhatsApp API change"
          );
          console.log(
            "Will attempt to connect with different browser/version fingerprints"
          );

          // Always try a different browser fingerprint
          currentBackupConfigIndex =
            (currentBackupConfigIndex + 1) % backupConnectionOptions.length;

          if (connectionRetryCount < MAX_RETRIES) {
            connectionRetryCount++;
            const delay = Math.min(1000 * 2 ** connectionRetryCount, 15000);
            console.log(
              `Reconnecting in ${
                delay / 1000
              }s (attempt ${connectionRetryCount}/${MAX_RETRIES}) with browser config #${
                currentBackupConfigIndex + 1
              }...`
            );
            setTimeout(connectToWhatsApp, delay);
          } else {
            console.log("Max connection retries reached after 405 errors");
            connectionRetryCount = 0; // Reset for next user attempt
          }
          return; // Skip the general reconnection logic
        }

        // Handle different disconnect scenarios
        if (statusCode === DisconnectReason.loggedOut) {
          console.log("User logged out - clearing auth data");
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }
          connectionRetryCount = 0; // Reset counter as user needs to re-login
        } else if (
          statusCode === 401 ||
          statusCode === 403 ||
          statusCode === 405
        ) {
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
        } else {
          // General reconnection for other errors
          if (connectionRetryCount < MAX_RETRIES) {
            connectionRetryCount++;
            const delay = Math.min(1000 * 2 ** connectionRetryCount, 30000); // Exponential backoff with 30s max
            console.log(
              `Reconnecting in ${
                delay / 1000
              }s (attempt ${connectionRetryCount}/${MAX_RETRIES}) with new connection options...`
            );
            setTimeout(connectToWhatsApp, delay);
          } else {
            console.log(
              "Max connection retries reached - please restart the application or try again later"
            );
            connectionRetryCount = 0;
          }
        }
      }
    });

    // Setup group update listeners
    sock.ev.on("groups.update", async (updates) => {
      if (!updates) return;

      // 'updates' is expected to be an array of group update objects.
      if (Array.isArray(updates)) {
        updates.forEach((update) => {
          updateGroupInDB(update);
        });
      } else if (updates) {
        updateGroupInDB(updates);
      }
    });

    // Listen for group participants update.
    sock.ev.on("group-participants.update", async (update) => {
      // In a participants update, we usually only have the group id and the updated participants.
      // We call updateGroupInDB with this update so that only the member_phone_no field is updated.
      updateGroupInDB(update);
    });
  } catch (error) {
    console.error("Error initializing WhatsApp connection:", error);

    // Implement retry logic for connection initialization errors
    if (connectionRetryCount < MAX_RETRIES) {
      connectionRetryCount++;
      const delay = Math.min(1000 * 2 ** connectionRetryCount, 30000); // Exponential backoff with 30s max
      console.log(
        `Connection failed. Retrying in ${
          delay / 1000
        }s (attempt ${connectionRetryCount}/${MAX_RETRIES})...`
      );
      setTimeout(connectToWhatsApp, delay);
    } else {
      console.error("Failed to connect to WhatsApp after maximum retries");
      connectionRetryCount = 0;
    }
  }
};

connectToWhatsApp();

// ----------------- ROUTES -----------------
app.get("/connect", (req, res) => {
  if (qrCodeBase64) res.json({ qr: qrCodeBase64 });
  else if (isAuthenticated) res.json({ status: "Already Connected" });
  else res.status(500).json({ status: "Error generating QR code" });
});

// Bulk add members to a group
app.post("/groups/bulk-add", isAuth, async (req, res) => {
  try {
    const { groupId, members } = req.body;

    if (!groupId || !Array.isArray(members)) {
      return res
        .status(400)
        .json({ error: "groupId and members array are required." });
    }

    // Filter out empty or falsy member entries.
    const validMembers = members.filter((m) => m && m.trim() !== "");

    // Append domain if missing.
    const participants = validMembers.map((m) =>
      m.endsWith("@s.whatsapp.net") ? m : `${m}@s.whatsapp.net`
    );

    const result = await sock.groupParticipantsUpdate(
      groupId,
      participants,
      "add"
    );
    res.json({ status: "Bulk add successful", result });
  } catch (error) {
    console.error("Bulk add members error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    isAuthenticated,
    isVerified,
    messagesSent: messageCount,
    messageLimit: isVerified ? "Unlimited" : 100,
    licenseInfo: licenseDetails,
  });
});

app.get("/get-profile", isAuth, async (req, res) => {
  try {
    if (!sock || !sock.user)
      return res.status(404).json({ error: "Profile not found" });
    const jid = sock.user.id.split(":")[0] || "";
    const name = sock.user.name || "";
    res.json({ number: jid, name, user: sock.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/logout", isAuth, async (req, res) => {
  try {
    if (sock) await sock.logout();
    fs.rmSync(authFolder, { recursive: true, force: true });
    isAuthenticated = false;
    sock = null;
    qrCodeBase64 = "";
    await connectToWhatsApp();
    res.json({ status: "Logged Out Successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error during logout" });
  }
});

// SEND SINGLE MESSAGE endpoint
app.post("/send-message", isAuth, async (req, res) => {
  try {
    if (!canSendMoreMessages()) {
      return res.status(403).json({
        error:
          "Message limit reached. Please verify your license to send more.",
      });
    }
    const {
      name = "Unknown",
      contact_type = "individual",
      number,
      message,
      attachment_document = [],
      attachment_thumbnail = [],
    } = req.body;
    const jid =
      contact_type === "group"
        ? number.includes("@g.us")
          ? number
          : `${number}@g.us`
        : `${number}@s.whatsapp.net`;
    await sendMessage({
      sock,
      jid,
      message,
      attachment_thumbnail,
      attachment_document,
    });
    incrementMessageCount();
    db.run(
      `INSERT INTO message_logs (name, whatsapp_no, contact_type, message, attachment_document, attachment_thumbnail)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        number,
        contact_type,
        message,
        JSON.stringify(attachment_document),
        JSON.stringify(attachment_thumbnail),
      ]
    );
    res.status(200).json({ status: "Message Sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// BULK SEND endpoint
app.post("/bulk-send", isAuth, (req, res) => {
  const { bulkMessages } = req.body;
  if (!Array.isArray(bulkMessages) || bulkMessages.length === 0) {
    return res.status(400).json({ error: "No messages provided." });
  }
  bulkMessages.forEach((msg) => {
    db.run(
      `INSERT INTO message_logs (name, whatsapp_no, contact_type, message, attachment_document, attachment_thumbnail, status, schedule_date, schedule_time, repeat_type)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        msg.name || "Unknown",
        msg.whatsapp_no,
        msg.contact_type,
        msg.message,
        JSON.stringify(msg?.attachment_document || []),
        JSON.stringify(msg?.attachment_thumbnail || []),
        msg.schedule_date,
        msg.schedule_time,
        msg.repeat_type || "none",
      ]
    );
  });
  res
    .status(200)
    .json({ status: "Bulk messages added to logs in pending status" });
});

// CRON JOB: PROCESS BULK MESSAGES (only for bulk messages with 'pending' status)
cron.schedule("* * * * *", async () => {
  processBulkMessages();
});

async function processBulkMessages() {
  try {
    // Skip if WhatsApp is not authenticated
    if (!isAuthenticated || !sock) {
      console.log("Skipping bulk messages processing - WhatsApp not connected");
      return;
    }

    const currentDate = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    console.log(
      `Checking for pending bulk messages at ${currentDate} ${currentTime}`
    );

    db.all(
      "SELECT * FROM message_logs WHERE status = 'pending' AND (schedule_date IS NULL OR schedule_date = '' OR (schedule_date <= ? AND schedule_time <= ?))",
      [currentDate, currentTime],
      async (err, rows) => {
        if (err) {
          console.error("Error fetching bulk pending messages:", err);
          return;
        }

        if (!rows || rows.length === 0) {
          console.log("No pending bulk messages to process");
          return;
        }

        console.log(`Found ${rows.length} pending bulk messages to process`);

        const {
          messageGapEnabled = false,
          gapType = "fixed",
          fixedGap = 3,
          randomGap = { min: 5, max: 10 },
          batchMessagesEnabled = false,
          batchSize = 10,
          batchIntervalType = "fixed",
          fixedBatchInterval = 30,
          randomBatchInterval = { min: 15, max: 45 },
        } = dataFileContent.settings.messagingPreferences || {};

        let i = 0;
        while (i < rows.length) {
          const batch = rows.slice(i, i + batchSize);
          console.log(`Processing batch of ${batch.length} bulk messages`);

          for (const row of batch) {
            // Check message limits
            if (!canSendMoreMessages()) {
              console.log(`Message limit reached for message ID ${row.id}`);
              db.run(
                "UPDATE message_logs SET status='failed', error_message=? WHERE id=?",
                [
                  "Message limit reached. Please verify license to send more.",
                  row.id,
                ]
              );
              continue;
            }

            // Format JID properly
            let jid = row.whatsapp_no;
            if (row.contact_type === "group" && !jid.includes("@g.us")) {
              jid = `${jid}@g.us`;
            } else if (
              row.contact_type !== "group" &&
              !jid.includes("@s.whatsapp.net")
            ) {
              jid = `${jid}@s.whatsapp.net`;
            }

            try {
              console.log(`Sending bulk message ID ${row.id} to ${jid}`);

              // Parse attachments safely
              let attachment_thumbnail = [];
              let attachment_document = [];

              try {
                attachment_thumbnail = JSON.parse(
                  row.attachment_thumbnail || "[]"
                );
                attachment_document = JSON.parse(
                  row.attachment_document || "[]"
                );

                // Ensure file paths are valid
                if (Array.isArray(attachment_thumbnail)) {
                  attachment_thumbnail = attachment_thumbnail.filter((item) => {
                    if (!item.path) return false;
                    const exists = fs.existsSync(item.path);
                    if (!exists) {
                      console.warn(
                        `Attachment file not found: ${item.path} for message ID ${row.id}`
                      );
                    }
                    return exists;
                  });
                }

                if (Array.isArray(attachment_document)) {
                  attachment_document = attachment_document.filter((item) => {
                    if (!item.path) return false;
                    const exists = fs.existsSync(item.path);
                    if (!exists) {
                      console.warn(
                        `Document file not found: ${item.path} for message ID ${row.id}`
                      );
                    }
                    return exists;
                  });
                }
              } catch (parseErr) {
                console.error(
                  `Error parsing attachments for message ID ${row.id}:`,
                  parseErr
                );
                attachment_thumbnail = [];
                attachment_document = [];
              }

              // Send the message
              await sendMessage({
                sock,
                jid,
                message: row.message,
                attachment_thumbnail,
                attachment_document,
              });

              incrementMessageCount();
              console.log(`Successfully sent bulk message ID ${row.id}`);

              // Mark as sent
              db.run("UPDATE message_logs SET status='sent' WHERE id=?", [
                row.id,
              ]);

              // Apply message gap if enabled
              if (messageGapEnabled) {
                const gapSec =
                  gapType === "random"
                    ? getRandomInt(randomGap.min, randomGap.max)
                    : fixedGap;

                console.log(`Waiting ${gapSec}s before next message`);
                await delay(gapSec * 1000);
              }
            } catch (sendErr) {
              console.error(
                `Error sending bulk message ID ${row.id}:`,
                sendErr
              );
              db.run(
                "UPDATE message_logs SET status='failed', error_message=? WHERE id=?",
                [sendErr.message || "Error sending message", row.id]
              );
            }
          }
          i += batchSize;
          if (batchMessagesEnabled && i < rows.length) {
            const intervalSec =
              batchIntervalType === "random"
                ? getRandomInt(randomBatchInterval.min, randomBatchInterval.max)
                : fixedBatchInterval;
            await delay(intervalSec * 1000);
          }
        }
      }
    );
  } catch (err) {
    console.error("Error processing bulk messages:", err);
  }
}

// CRON JOB: CHECK & SEND SCHEDULED MESSAGES
cron.schedule("* * * * *", async () => {
  // Skip if WhatsApp is not authenticated
  if (!isAuthenticated || !sock) {
    console.log("Skipping scheduled messages check - WhatsApp not connected");
    return;
  }

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);

  console.log(
    `Checking for scheduled messages at ${currentDate} ${currentTime}`
  );

  const sql = `
    SELECT * FROM message_logs
    WHERE status = 'scheduled'
      AND schedule_date <= ?
      AND schedule_time <= ?
  `;

  db.all(sql, [currentDate, currentTime], async (err, rows) => {
    if (err) {
      console.error("Error fetching scheduled messages:", err);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log("No scheduled messages to send at this time");
      return;
    }

    console.log(`Found ${rows.length} scheduled messages to send`);

    const {
      messageGapEnabled = false,
      gapType = "fixed",
      fixedGap = 3,
      randomGap = { min: 5, max: 10 },
      batchMessagesEnabled = false,
      batchSize = 10,
      batchIntervalType = "fixed",
      fixedBatchInterval = 30,
      randomBatchInterval = { min: 15, max: 45 },
    } = dataFileContent.settings.messagingPreferences || {};

    let i = 0;
    while (i < rows.length) {
      const batch = rows.slice(i, i + batchSize);
      console.log(`Processing batch of ${batch.length} messages`);

      for (const row of batch) {
        // Check message limits
        if (!canSendMoreMessages()) {
          console.log(`Message limit reached for message ID ${row.id}`);
          db.run(
            "UPDATE message_logs SET status='failed', error_message=? WHERE id=?",
            [
              "Message limit reached. Please verify license to send more.",
              row.id,
            ]
          );
          continue;
        }

        // Format JID properly
        let jid = "";
        if (row.contact_type === "group") {
          jid = row.whatsapp_no.includes("@g.us")
            ? row.whatsapp_no
            : `${row.whatsapp_no}@g.us`;
        } else {
          jid = row.whatsapp_no.includes("@s.whatsapp.net")
            ? row.whatsapp_no
            : `${row.whatsapp_no}@s.whatsapp.net`;
        }

        try {
          console.log(`Sending scheduled message ID ${row.id} to ${jid}`);

          // Parse attachments safely
          let attachment_thumbnail = [];
          let attachment_document = [];

          try {
            attachment_thumbnail = JSON.parse(row.attachment_thumbnail || "[]");
            attachment_document = JSON.parse(row.attachment_document || "[]");

            // Ensure file paths are valid
            if (Array.isArray(attachment_thumbnail)) {
              attachment_thumbnail = attachment_thumbnail.filter((item) => {
                if (!item.path) return false;
                const exists = fs.existsSync(item.path);
                if (!exists) {
                  console.warn(
                    `Attachment file not found: ${item.path} for message ID ${row.id}`
                  );
                }
                return exists;
              });
            }

            if (Array.isArray(attachment_document)) {
              attachment_document = attachment_document.filter((item) => {
                if (!item.path) return false;
                const exists = fs.existsSync(item.path);
                if (!exists) {
                  console.warn(
                    `Document file not found: ${item.path} for message ID ${row.id}`
                  );
                }
                return exists;
              });
            }
          } catch (parseErr) {
            console.error(
              `Error parsing attachments for message ID ${row.id}:`,
              parseErr
            );
            attachment_thumbnail = [];
            attachment_document = [];
          }

          // Send the message
          await sendMessage({
            sock,
            jid,
            message: row.message,
            attachment_thumbnail,
            attachment_document,
          });

          incrementMessageCount();
          console.log(`Successfully sent scheduled message ID ${row.id}`);

          // Mark as sent
          db.run("UPDATE message_logs SET status='sent' WHERE id=?", [row.id]);

          // Apply message gap if enabled
          if (messageGapEnabled) {
            const gapSec =
              gapType === "random"
                ? getRandomInt(randomGap.min, randomGap.max)
                : fixedGap;

            console.log(`Waiting ${gapSec}s before next message`);
            await delay(gapSec * 1000);
          }
        } catch (sendErr) {
          console.error(
            `Error sending scheduled message ID ${row.id}:`,
            sendErr
          );

          db.run(
            "UPDATE message_logs SET status='failed', error_message=? WHERE id=?",
            [sendErr.message || "Error sending message", row.id]
          );
        }
      }
      i += batchSize;
      if (batchMessagesEnabled && i < rows.length) {
        const intervalSec =
          batchIntervalType === "random"
            ? getRandomInt(randomBatchInterval.min, randomBatchInterval.max)
            : fixedBatchInterval;
        await delay(intervalSec * 1000);
      }
    }
  });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.send({
    message: "Hello from the backend!",
    isVerified,
    totalSent: messageCount,
    canSendMore: canSendMoreMessages(),
  });
});

// License verification endpoint
app.post("/license-verify", async (req, res) => {
  try {
    const { activationCode: actCode } = req.body;
    if (!actCode) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing activation code" });
    }
    const hwId = machineIdSync();
    const devName = os.hostname();
    saveUserData("activationCode", actCode);
    saveUserData("hardwareId", hwId);
    saveUserData("deviceName", devName);
    activationCode = actCode;
    await checkLicense();
    if (isVerified) {
      res.json({
        status: "ok",
        message:
          licenseDetails.message ||
          "License verified. You have PRO (unlimited) access.",
        token: licenseDetails.token,
        devices: licenseDetails.devices,
        planType: licenseDetails.planType,
        expiryDate: licenseDetails.expiryDate,
      });
    } else {
      res.json({
        status: "error",
        message: "License not verified. Please check your activation code.",
      });
    }
  } catch (err) {
    console.error("license-verify error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Internal error verifying license" });
  }
});

// Attach Routers
app.use("/file", FilesRouter);
app.use("/categories", isAuth, addDb, CategoriesRouter);
app.use("/groups", isAuth, addDb, GroupsRouter);
app.use("/contacts", isAuth, addDb, ContactsRouter);
app.use("/contact-groups", isAuth, addDb, ContactsGroupsRouter);
app.use("/templates", isAuth, addDb, TmeplateRouter);
app.use("/scheduled", isAuth, addDb, SheduleRouter);
app.use("/logs", isAuth, addDb, LogsRouter);

module.exports = { app };
