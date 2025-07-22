const express = require("express");
const CategoriesRouter = express.Router();

CategoriesRouter.get("/", (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  req.db.all(
    "SELECT id, name FROM categories LIMIT ? OFFSET ?",
    [limit, offset],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ categories: rows });
      }
    }
  );
});

CategoriesRouter.get("/:id", (req, res) => {
  const { id } = req.params;
  req.db.get(
    "SELECT id, name FROM categories WHERE id = ?",
    [id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!row) {
        res.status(404).json({ error: "Category not found" });
      } else {
        res.json({ category: row });
      }
    }
  );
});

CategoriesRouter.post("/", (req, res) => {
  const { name } = req.body;
  req.db.run(
    `INSERT INTO categories (name) VALUES (?)`,
    [name],
    function (err) {
      if (err) {
        console.error("Error inserting category:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Category inserted", id: this.lastID });
      }
    }
  );
});

CategoriesRouter.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  req.db.run(
    `UPDATE categories SET name = ? WHERE id = ?`,
    [name, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Category updated" });
      }
    }
  );
});

CategoriesRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  req.db.run(`DELETE FROM categories WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Error deleting category:", err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "Category deleted" });
    }
  });
});

CategoriesRouter.delete("/category-multi", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: "Invalid or empty ids array" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const sql = `DELETE FROM categories WHERE id IN (${placeholders})`;
  req.db.run(sql, ids, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "Categories deleted success" });
    }
  });
});

module.exports = CategoriesRouter;
