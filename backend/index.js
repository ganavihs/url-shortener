const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();
const cors = require('cors');

const encodeBase62 = require("./utils/base62");

const app = express();
// Allow frontend dev server origin (localhost and 127.0.0.1)
app.use(
    cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] })
);
// Simple request logger to help debug routing
app.use((req, res, next) => {
    console.log("INCOMING", req.method, req.url);
    next();
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

// Health check
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.send("Server and database are working!");
    } catch (error) {
        console.error(error);
        res.status(500).send("Database connection failed");
    }
});

// Create short URL
app.post("/api/shorten", async (req, res) => {
    try {
        const { longUrl } = req.body;

        if (!longUrl) {
            return res.status(400).json({
                error: "longUrl is required"
            });
        }

        // Insert the long URL into the database
        const result = await pool.query(
            "INSERT INTO urls (long_url, short_code) VALUES ($1, $2) RETURNING id",
            [longUrl, "temp"]
        );

        // Get the generated database ID
        const id = result.rows[0].id;

        // Convert ID into Base62 short code
        const shortCode = encodeBase62(id);

        // Update the row with the actual short code
        await pool.query(
            "UPDATE urls SET short_code = $1 WHERE id = $2",
            [shortCode, id]
        );

        // Send the short URL back to the user
        res.json({
            shortCode: shortCode,
            shortUrl: `http://localhost:3000/${shortCode}`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to shorten URL"
        });
    }
});

// Redirect short URL to original URL
app.get("/:code", async (req, res) => {
    try {
        // Get the short code from the URL
        const { code } = req.params;

        // Search for the short code in PostgreSQL
        const result = await pool.query(
            "SELECT long_url FROM urls WHERE short_code = $1",
            [code]
        );

        // If short code doesn't exist
        if (result.rows.length === 0) {
            return res.status(404).send("Short URL not found");
        }

        // Get the original URL
        const longUrl = result.rows[0].long_url;

        // Log redirect and send the redirect response
        console.log('REDIRECT', code, '->', longUrl);
        res.redirect(longUrl);

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});