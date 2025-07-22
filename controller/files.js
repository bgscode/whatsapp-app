const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { app } = require("electron");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create a consistent upload path
    const uploadPath = path.join(app.getPath("userData"), "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    console.log(`Using upload path: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const newFilename = file.originalname.replace(/\s/g, "_");
    const filename = `${Date.now()}-${newFilename}`;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({ storage });

const FilesRouter = express.Router();

FilesRouter.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    path: file.path,
    url: `http://localhost:5000/uploads/${file.filename}`,
    filename: file.filename,
    size: file.size,
    type: file.mimetype,
  });
});

FilesRouter.post("/delete", (req, res) => {
  const { path: filePath } = req.body;
  fs.unlink(filePath, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "File deleted" });
    }
  });
});

module.exports = FilesRouter;
