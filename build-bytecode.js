const fs = require("fs");
const path = require("path");
const { compileFileSync, compileFile } = require("bytenode");

/**
 * Compile a single file from .js to .jsc using bytenode.
 * @param {string} filePath - Absolute path to the .js file.
 */
function compileFileWrapper(filePath) {
  const output = filePath.replace(/\.js$/, ".jsc");
  console.log(`Compiling: ${filePath} -> ${output}`);
  try {
    if (typeof compileFileSync === "function") {
      compileFileSync(filePath, output);
      console.log(`Compiled ${filePath} successfully (sync)`);
    } else if (typeof compileFile === "function") {
      // Fallback to asynchronous compile if sync is not available.
      compileFile(filePath, output, (error) => {
        if (error) {
          console.error(`Error compiling ${filePath} (async):`, error);
        } else {
          console.log(`Compiled ${filePath} successfully (async)`);
        }
      });
    } else {
      console.error("No compile function available in bytenode.");
    }
  } catch (error) {
    console.error(`Error compiling ${filePath}:`, error);
  }
}

/**
 * Recursively compile all .js files in a directory.
 * @param {string} dirPath - The directory path to compile.
 */
function compileDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      compileDirectory(fullPath);
    } else if (item.endsWith(".js")) {
      compileFileWrapper(fullPath);
    }
  }
}

// --- Compile main.js and server.js ---
const mainJs = path.join(__dirname, "main.js");
const serverJs = path.join(__dirname, "server.js");

if (fs.existsSync(mainJs)) {
  compileFileWrapper(mainJs);
} else {
  console.log("main.js not found.");
}

if (fs.existsSync(serverJs)) {
  compileFileWrapper(serverJs);
} else {
  console.log("server.js not found.");
}

// --- Compile all .js files in the controller folder ---
const controllersDir = path.join(__dirname, "controller");
if (fs.existsSync(controllersDir)) {
  compileDirectory(controllersDir);
} else {
  console.log("controller folder not found.");
}

console.log("Bytecode compilation complete.");
