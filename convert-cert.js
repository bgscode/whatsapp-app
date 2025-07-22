const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Define file paths
const certPath = path.join(__dirname, "cert.pem");
const keyPath = path.join(__dirname, "key.pem");
const pfxPath = path.join(__dirname, "certificate.pfx");
const password = "1234"; // Empty password or set one as needed

console.log("Converting PEM certificate to PFX format...");

try {
  // Check if OpenSSL is installed
  try {
    execSync("openssl version", { stdio: "pipe" });
    console.log("OpenSSL is installed.");
  } catch (error) {
    console.error("Error: OpenSSL is not installed or not in PATH.");
    console.error(
      "Please install OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html"
    );
    process.exit(1);
  }

  // Check if certificate files exist
  if (!fs.existsSync(certPath)) {
    console.error(`Certificate file not found: ${certPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(keyPath)) {
    console.error(`Private key file not found: ${keyPath}`);
    process.exit(1);
  }

  // Convert PEM to PFX using OpenSSL
  const command = `openssl pkcs12 -export -out "${pfxPath}" -inkey "${keyPath}" -in "${certPath}" -passout pass:${password}`;

  console.log("Executing OpenSSL command...");
  execSync(command);

  console.log(`Certificate successfully converted to PFX format: ${pfxPath}`);
  console.log('You can now build your application with "npm run build:win"');
} catch (error) {
  console.error("Error converting certificate:", error.message);
  process.exit(1);
}
