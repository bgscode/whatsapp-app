const express = require("express");

const ContactsRouter = express.Router();

ContactsRouter.get("/", (req, res) => {
  req.db.all("SELECT * FROM contacts", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ contacts: rows });
    }
  });
});

ContactsRouter.get("/:id", (req, res) => {
  const { id } = req.params;
  req.db.get("SELECT * FROM contacts WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: "Contact not found" });
    } else {
      res.json({ contact: row });
    }
  });
});

ContactsRouter.post("/", (req, res) => {
  const { name, whatsapp_no, contact_group_id, other_fields } = req.body;
  req.db.run(
    `INSERT INTO contacts (name, whatsapp_no, contact_group_id, other_fields) VALUES (?, ?, ?, ?)`,
    [name, whatsapp_no, contact_group_id, other_fields],
    function (err) {
      if (err) {
        console.error("Error inserting contact:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Contact inserted", id: this.lastID });
      }
    }
  );
});

ContactsRouter.post("/bulk", (req, res) => {
  const { contacts } = req.body;
  //   console.log("contacts", contacts);
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: "Invalid or empty contacts array" });
  }

  const values = contacts.map((contact) => [
    contact.name,
    contact.whatsapp_no,
    contact.contact_group_id,
    contact.other_fields,
  ]);

  const placeholders = contacts.map(() => "(?, ?, ?, ?)").join(",");
  const sql = `INSERT INTO contacts (name, whatsapp_no, contact_group_id, other_fields) VALUES ${placeholders}`;

  req.db.run(sql, values.flat(), function (err) {
    if (err) {
      console.error("Error inserting contacts:", err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "Contacts inserted" });
    }
  });
});

ContactsRouter.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, whatsapp_no, contact_group_id, other_fields } = req.body;
  req.db.run(
    `UPDATE contacts SET name = ?, whatsapp_no = ?, contact_group_id = ?, other_fields = ? WHERE id = ?`,
    [name, whatsapp_no, contact_group_id, other_fields, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ status: "Contact updated" });
      }
    }
  );
});

ContactsRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  req.db.run(`DELETE FROM contacts WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Error deleting contact:", err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "Contact deleted" });
    }
  });
});

ContactsRouter.delete("/multi", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: "Invalid or empty ids array" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const sql = `DELETE FROM contacts WHERE id IN (${placeholders})`;
  req.db.run(sql, ids, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ status: "Contacts deleted success" });
    }
  });
});

ContactsRouter.post("/export-csv", (req, res) => {
  const query = `
   SELECT 
      contacts.id, 
      contacts.name, 
      contacts.whatsapp_no, 
      contact_groups.name AS contact_group_name,
      contact_groups.id AS contact_group_id
    FROM contacts 
    LEFT JOIN contact_groups ON contacts.contact_group_id = contact_groups.id
  `;

  req.db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const csv = rows.reduce(
      (acc, curr) =>
        `${acc}${curr.id},${curr.name},${curr.whatsapp_no},${
          curr.contact_group_name || ""
        },${curr.contact_group_id || ""}\n`,
      "id,name,whatsapp_no,contact_group_name,contact_group_id\n"
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=contacts.csv");
    res.send(csv);
  });
});

// Route for exporting selected contacts by their ids
ContactsRouter.post("/export-csv/selected", (req, res) => {
  const { ids } = req.body; // expects an array of contact ids

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids must be a non-empty array" });
  }

  // Create placeholders for parameterized query
  const placeholders = ids.map(() => "?").join(",");
  const query = `
    SELECT 
      contacts.id, 
      contacts.name, 
      contacts.whatsapp_no, 
      contact_groups.name AS contact_group_name,
      contact_groups.id AS contact_group_id
    FROM contacts 
    LEFT JOIN contact_groups ON contacts.contact_group_id = contact_groups.id
    WHERE contacts.id IN (${placeholders})
  `;

  req.db.all(query, ids, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const header = "id,name,whatsapp_no,contact_group_name,contact_group_id\n";
    const csvRows = rows
      .map(
        (row) =>
          `${row.id},${row.name},${row.whatsapp_no},${
            row.contact_group_name || ""
          },${row.contact_group_id || ""}`
      )
      .join("\n");

    const csv = header + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=selected_contacts.csv"
    );
    res.send(csv);
  });
});

ContactsRouter.post("/export-csv/groups", (req, res) => {
  const { groupId, ids } = req.body;
  if (!groupId) {
    return res.status(400).json({ error: "groupId is required" });
  }

  // First, fetch the group details
  const groupQuery = `SELECT * FROM contact_groups WHERE id = ?`;
  req.db.get(groupQuery, [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Set the filename using the group's name
    const fileName = `${group.name}.csv`;

    // Parse the group's "fields" column which is assumed to be a JSON string.
    let headerFields = [];
    try {
      headerFields = JSON.parse(group.fields).map((field) => field.id);
    } catch (e) {
      // If parsing fails, return an error or assign an empty array.
      return res.status(500).json({ error: "Invalid group fields format" });
    }

    // Build the query to fetch contacts for the group.
    let query = "";
    let params = [];
    headerFields = headerFields.filter(
      (field) => field !== "id" && field !== "name" && field !== "whatsapp_no"
    );

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      query = `
        SELECT id, name, whatsapp_no, other_fields
        FROM contacts
        WHERE contact_group_id = ? AND id IN (${placeholders})
      `;
      params = [groupId, ...ids];
    } else {
      query = `
        SELECT id, name, whatsapp_no, other_fields
        FROM contacts
        WHERE contact_group_id = ?
      `;
      params = [groupId];
    }

    // Fetch contacts based on the constructed query and parameters
    req.db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Create CSV rows from the contacts
      const csvRows = rows.map((row) => {
        let otherFields = {};
        try {
          otherFields = JSON.parse(row.other_fields);
        } catch (e) {
          otherFields = {};
        }
        // Map headerFields to values from the "other_fields" JSON object

        const values = headerFields.map((field) => otherFields[field] || "");
        return `${row.id},${row.name},${row.whatsapp_no},${values.join(",")}`;
      });

      // Create the CSV header row: contact columns plus the dynamic fields from the group
      const headerRow = ["id", "name", "whatsapp_no", ...headerFields].join(
        ","
      );
      const csv = [headerRow, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.send(csv);
    });
  });
});

module.exports = ContactsRouter;
