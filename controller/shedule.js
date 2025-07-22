const express = require("express");
const SheduleRouter = express.Router();

/**
 * CREATE a new "scheduled" message in message_logs
 * We mark status = "scheduled"
 */
SheduleRouter.post("/", (req, res) => {
  const { schedules } = req.body;

  if (!Array.isArray(schedules) || schedules.length === 0) {
    return res
      .status(400)
      .json({ error: "Schedules should be a non-empty array" });
  }

  const sql = `
    INSERT INTO message_logs (
      name, whatsapp_no, contact_type, message, 
      attachment_document, attachment_thumbnail,
      schedule_date, schedule_time, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
  `;

  const insertSchedule = (schedule, callback) => {
    const {
      shedule_name,
      whatsapp_no,
      contact_type,
      message,
      attachment_document = [],
      attachment_thumbnail = [],
      schedule_date,
      schedule_time,
    } = schedule;

    if (!whatsapp_no || !message || !schedule_date || !schedule_time) {
      return callback(
        new Error(
          "Missing required fields: whatsapp_no, message, schedule_date, schedule_time"
        )
      );
    }

    const values = [
      shedule_name || "My Schedule",
      whatsapp_no,
      contact_type || "individual",
      message,
      JSON.stringify(attachment_document) || null,
      JSON.stringify(attachment_thumbnail) || null,
      schedule_date,
      schedule_time,
    ];

    req.db.run(sql, values, function (err) {
      if (err) {
        return callback(err);
      }
      callback(null, this.lastID);
    });
  };

  const results = [];
  let completed = 0;
  let hasError = false;

  schedules.forEach((schedule, index) => {
    insertSchedule(schedule, (err, id) => {
      if (hasError) return;
      if (err) {
        hasError = true;
        return res.status(500).json({ error: err.message });
      }
      results[index] = { status: "Schedule created", id };
      completed += 1;
      if (completed === schedules.length) {
        return res.json(results);
      }
    });
  });
});

/**
 * READ all "scheduled" messages (paged)
 * Only fetch rows where status = 'scheduled'.
 */
SheduleRouter.get("/", (req, res) => {
  const { status = "all" } = req.query;

  let sql = `
    SELECT *
    FROM message_logs
    WHERE schedule_date IS NOT NULL
      AND schedule_time IS NOT NULL
  `;

  if (status !== "all") {
    sql += ` AND status = ?`;
  }

  sql += ` ORDER BY id DESC`;

  const params = status !== "all" ? [status] : [];

  req.db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ scheduled_messages: rows });
  });
});

/**
 * READ a single scheduled message by ID
 * Ensure it has status = 'scheduled'.
 */
SheduleRouter.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT *
    FROM message_logs
    WHERE id = ?
      AND status = 'scheduled'
  `;
  req.db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Scheduled message not found" });
    }
    return res.json({ scheduled_message: row });
  });
});

/**
 * UPDATE a scheduled message by ID
 * (Allows editing content, attachments, date/time, or even status)
 */
SheduleRouter.put("/", (req, res) => {
  const { schedules } = req.body;

  if (!Array.isArray(schedules) || schedules.length === 0) {
    return res
      .status(400)
      .json({ error: "Schedules should be a non-empty array" });
  }

  const sql = `
    UPDATE message_logs
    SET name = ?,
        whatsapp_no = ?,
        contact_type = ?,
        message = ?,
        attachment_document = ?,
        attachment_thumbnail = ?,
        schedule_date = ?,
        schedule_time = ?,
        status = ?
    WHERE id = ?
      AND status = 'scheduled'
  `;

  const updateSchedule = (schedule, callback) => {
    const {
      id,
      shedule_name,
      whatsapp_no,
      contact_type,
      message,
      attachment_document,
      attachment_thumbnail,
      schedule_date,
      schedule_time,
      status,
    } = schedule;

    if (!id || !whatsapp_no || !message || !schedule_date || !schedule_time) {
      return callback(
        new Error(
          "Missing required fields: id, whatsapp_no, message, schedule_date, schedule_time"
        )
      );
    }

    const values = [
      shedule_name,
      whatsapp_no,
      contact_type,
      message,
      attachment_document,
      attachment_thumbnail,
      schedule_date,
      schedule_time,
      status,
      id,
    ];

    req.db.run(sql, values, function (err) {
      if (err) {
        return callback(err);
      }
      callback(null, this.changes);
    });
  };

  const results = [];
  let completed = 0;
  let hasError = false;

  schedules.forEach((schedule, index) => {
    updateSchedule(schedule, (err, changes) => {
      if (hasError) return;
      if (err) {
        hasError = true;
        return res.status(500).json({ error: err.message });
      }
      results[index] = { status: "Schedule updated", changes };
      completed += 1;
      if (completed === schedules.length) {
        return res.json(results);
      }
    });
  });
});

/**
 * DELETE a scheduled message by ID
 * (Removes from message_logs if still 'scheduled')
 */
// SheduleRouter.delete("/:id", (req, res) => {
//   const { id } = req.params;

//   const sql = `
//     DELETE FROM message_logs
//     WHERE id = ?
//       AND status = 'scheduled'
//   `;
//   req.db.run(sql, [id], function (err) {
//     if (err) {
//       return res.status(500).json({ error: err.message });
//     }
//     if (this.changes === 0) {
//       return res
//         .status(404)
//         .json({ error: "No scheduled message found with that ID" });
//     }
//     return res.json({ status: "Scheduled message deleted" });
//   });
// });

SheduleRouter.post("/destory", (req, res) => {
  const { ids } = req.body;
  console.log(ids);

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "IDs should be a non-empty array" });
  }

  const sql = `DELETE FROM message_logs WHERE id = ?`;

  const deleteSchedule = (id, callback) => {
    req.db.run(sql, [id], function (err) {
      if (err) {
        return callback(err);
      }
      callback(null, this.changes);
    });
  };

  const results = [];
  let completed = 0;
  let hasError = false;

  ids.forEach((id, index) => {
    deleteSchedule(id, (err, changes) => {
      if (hasError) return;
      if (err) {
        hasError = true;
        return res.status(500).json({ error: err.message });
      }
      results[index] = { status: "Schedule deleted", changes };
      completed += 1;
      if (completed === ids.length) {
        return res.json(results);
      }
    });
  });
});

module.exports = SheduleRouter;
