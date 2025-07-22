const express = require("express");

const GroupsRouter = express.Router();

GroupsRouter.get("/", (req, res) => {
  const { page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  req.db.all("SELECT * FROM groups", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ groups: rows });
  });
});

GroupsRouter.get("/members", (req, res) => {
  const { page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  req.db.all(
    "SELECT * FROM groups LIMIT ? OFFSET ?",
    [limitNum, offset],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const memberwise = rows.map((group) => {
        const members = group.member_phone_no
          ? group.member_phone_no.split(",")
          : [];
        return members.map((member) => {
          return {
            group_id: group.group_id,
            name: group.name,
            member_phone_no: member.split("@")[0],
            tags: "",
          };
        });
      });
      res.json({ groups: memberwise.flat() });
    }
  );
});

GroupsRouter.post("/members/export-csv", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid or empty ids array" });
  }

  const placeholders = ids.map(() => "?").join(",");
  const query = `SELECT * FROM groups WHERE group_id IN (${placeholders})`;

  req.db.all(query, ids, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const memberwise = rows.map((group) => {
      const members = group.member_phone_no
        ? group.member_phone_no.split(",")
        : [];
      return members.map((member) => ({
        group_id: group.group_id,
        name: group.name,
        member_phone_no: `+${member.split("@")[0]}`,
      }));
    });

    const csv = memberwise
      .flat()
      .reduce(
        (acc, curr) =>
          `${acc}${curr.group_id},${curr.name},${curr.member_phone_no}\n`,
        "group_id,name,member_phone_no\n"
      );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=group_members.csv"
    );
    res.send(csv);
  });
});

GroupsRouter.post("/all-members/export-csv", (req, res) => {
  const query = `SELECT * FROM groups`;
  req.db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const memberwise = rows.map((group) => {
      const members = group.member_phone_no
        ? group.member_phone_no.split(",")
        : [];
      return members.map((member) => ({
        group_id: group.group_id,
        name: group.name,
        member_phone_no: `+${member.split("@")[0]}`,
      }));
    });

    const csv = memberwise
      .flat()
      .reduce(
        (acc, curr) =>
          `${acc}${curr.group_id},${curr.name},${curr.member_phone_no}\n`,
        "group_id,name,member_phone_no\n"
      );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=group_members.csv"
    );
    res.send(csv);
  });
});

module.exports = GroupsRouter;
