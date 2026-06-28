// 




import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "./db.js";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "dev_secret";

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    // PostgreSQL
    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    const hash = await bcrypt.hash(password, 12);

    // PostgreSQL RETURNING
    const { rows } = await pool.query(
      `INSERT INTO users(name,email,password_hash)
       VALUES($1,$2,$3)
       RETURNING id,name,email`,
      [name, email, hash]
    );

    const user = rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  try {
    const payload = jwt.verify(header.slice(7), SECRET);

    res.json({
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
      },
    });
  } catch {
    res.status(401).json({
      error: "Invalid token",
    });
  }
});

export default router;