const express = require("express");

const ContactsGroupsRouter = express.Router();

ContactsGroupsRouter.get("/", (req, res) => {
  req.db.all("SELECT * FROM contact_groups", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ contact_groups: rows });
    }
  });
});

ContactsGroupsRouter.get("/:id", (req, res) => {
  const { id } = req.params;
  req.db.get("SELECT * FROM contact_groups WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: "Contact group not found" });
    } else {
      res.json({ contact_group: row });
    }
  });
});

ContactsGroupsRouter.post("/", (req, res) => {
  const { name, fields } = req.body;
  req.db.run(
    `INSERT INTO contact_groups (name, fields) VALUES (?, ?)`,
    [name, fields],
    function (err) {
      if (err) {
        console.error("Error inserting contact group:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Contact group inserted", id: this.lastID });
      }
    }
  );
});

ContactsGroupsRouter.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, fields } = req.body;
  req.db.run(
    `UPDATE contact_groups SET name = ?, fields = ? WHERE id = ?`,
    [name, fields, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Contact group updated" });
      }
    }
  );
});

ContactsGroupsRouter.delete("/:id", (req, res) => {
  const { id } = req.params;

  req.db.run(`DELETE FROM contact_groups WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Error deleting contact group:", err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "Contact group deleted" });
    }
  });
});

module.exports = ContactsGroupsRouter;
