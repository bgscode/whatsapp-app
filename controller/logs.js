// controller/logs.js

const express = require("express");
const LogsRouter = express.Router();

LogsRouter.get("/", (req, res) => {
  const db = req.db; // Because we use addDb to attach the DB

  const sql = `
    SELECT *
    FROM message_logs
    ORDER BY id DESC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Return them all
    return res.json(rows);
  });
});

module.exports = LogsRouter;
