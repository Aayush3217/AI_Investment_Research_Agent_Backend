import express from "express";
import pool from "./db.js";
import { authMiddleware } from "./authMiddleware.js";
import { runResearchAgent } from "./agent.js";

const router = express.Router();

// GET /api/research/stream
router.get("/stream", authMiddleware, async (req, res) => {
  const { company } = req.query;

  if (!company || company.trim().length < 1) {
    return res
      .status(400)
      .json({ error: "company query param is required" });
  }

  // Server Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const report = await runResearchAgent(
      company.trim(),
      (progress) => {
        send("progress", progress);
      }
    );

    // Save report into PostgreSQL
    const { rows } = await pool.query(
      `
      INSERT INTO research_reports
      (
        user_id,
        company_name,
        verdict,
        confidence,
        summary,
        full_report
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
      `,
      [
        req.user.id,
        report.company,
        report.verdict.verdict || "HOLD",
        report.verdict.confidence || 50,
        report.verdict.thesis || "",
        JSON.stringify(report),
      ]
    );

    send("complete", {
      report_id: rows[0].id,
      report,
    });

    res.write("event: done\ndata: {}\n\n");
  } catch (err) {
    console.error("Agent error:", err);

    send("error", {
      message: err.message || "Research failed",
    });
  } finally {
    res.end();
  }
});

// GET /api/research/history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        company_name,
        verdict,
        confidence,
        summary,
        created_at
      FROM research_reports
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [req.user.id]
    );

    res.json({
      reports: rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

// GET /api/research/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM research_reports
      WHERE id = $1
      AND user_id = $2
      `,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Report not found",
      });
    }

    const report = rows[0];

    if (report.full_report) {
      report.full_report = JSON.parse(report.full_report);
    }

    res.json({
      report,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

// DELETE /api/research/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `
      DELETE FROM research_reports
      WHERE id = $1
      AND user_id = $2
      `,
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

export default router;