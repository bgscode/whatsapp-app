const express = require("express");

const TmeplateRouter = express.Router();

TmeplateRouter.post("/", (req, res) => {
  let {
    name,
    message,
    category_id,
    variables,
    attachment_document,
    attachment_thumbnail,
  } = req.body;

  attachment_document = JSON.stringify(attachment_document);
  attachment_thumbnail = JSON.stringify(attachment_thumbnail);

  req.db.run(
    `INSERT INTO templets (name, message, category_id, variables, attachment_document, attachment_thumbnail) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      name,
      message,
      category_id,
      variables,
      attachment_document,
      attachment_thumbnail,
    ],
    function (err) {
      if (err) {
        console.error("Error inserting templet:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Templet inserted", id: this.lastID });
      }
    }
  );
});

TmeplateRouter.put("/:id", (req, res) => {
  const { id } = req.params;
  let {
    name,
    message,
    category_id,
    variables,
    attachment_thumbnail,
    attachment_document,
  } = req.body;

  attachment_document = JSON.stringify(attachment_document);
  attachment_thumbnail = JSON.stringify(attachment_thumbnail);

  req.db.run(
    `UPDATE templets 
     SET name = ?, message = ?, category_id = ?, variables = ?, attachment_thumbnail = ?, attachment_document = ?
     WHERE id = ?`,
    [
      name,
      message,
      category_id,
      variables,
      attachment_thumbnail,
      attachment_document,
      id,
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Templet updated" });
      }
    }
  );
});

TmeplateRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  req.db.run(`DELETE FROM templets WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Error deleting templet:", err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "Templet deleted" });
    }
  });
});

TmeplateRouter.get("/", (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      t.id, t.name, t.message, t.variables, 
      t.attachment_document, t.attachment_thumbnail, 
      json_object('id', c.id, 'name', c.name) AS category
    FROM templets t
    LEFT JOIN categories c ON t.category_id = c.id
    LIMIT ? OFFSET ?
  `;

  req.db.all(query, [limit, offset], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ templets: rows });
    }
  });
});

module.exports = TmeplateRouter;
