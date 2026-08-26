const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();
const cors = require("cors");

const encodeBase62 = require("./utils/base62");

const app = express();

// Allow frontend dev server
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ]
    })
);

// Request logger
app.use((req, res, next) => {
    console.log("INCOMING", req.method, req.url);
    next();
});

// Parse JSON requests
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

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


// ======================================================
// CREATE SHORT URL
// ======================================================

app.post("/api/shorten", async (req, res) => {
    try {

        const longUrl = typeof req.body?.longUrl === "string"
            ? req.body.longUrl.trim()
            : "";

        const customAlias = typeof req.body?.customAlias === "string"
            ? req.body.customAlias.trim()
            : "";


        // ==================================================
        // CHECK LONG URL
        // ==================================================

        if (!longUrl) {
            return res.status(400).json({
                error: "longUrl is required"
            });
        }


        // ==================================================
        // URL VALIDATION
        // ==================================================

        try {
            new URL(longUrl);
        } catch {
            return res.status(400).json({
                error: "Please enter a valid URL"
            });
        }


        // ==================================================
        // CUSTOM ALIAS
        // ==================================================

        if (customAlias) {

            // Check alias length
            if (customAlias.length > 50) {
                return res.status(400).json({
                    error: "Custom alias must be 50 characters or fewer"
                });
            }


            // ==================================================
            // CUSTOM ALIAS FORMAT VALIDATION
            // ==================================================

            if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
                return res.status(400).json({
                    error: "Custom alias can only contain letters, numbers, hyphens, and underscores"
                });
            }


            // Check if custom alias already exists
            const existing = await pool.query(
                "SELECT id FROM urls WHERE short_code = $1",
                [customAlias]
            );


            // Alias already exists
            if (existing.rows.length > 0) {

                return res.status(409).json({
                    error: "Custom alias is already taken"
                });

            }


            // Save URL with custom alias
            await pool.query(
                "INSERT INTO urls (long_url, short_code) VALUES ($1, $2)",
                [longUrl, customAlias]
            );


            // Send response
            return res.json({
                shortCode: customAlias,
                shortUrl: `http://localhost:3000/${customAlias}`
            });
        }


        // ==================================================
        // CHECK FOR DUPLICATE URL
        // ==================================================

        const existingUrl = await pool.query(
            "SELECT short_code FROM urls WHERE long_url = $1 LIMIT 1",
            [longUrl]
        );


        // If URL already exists, return existing short URL
        if (existingUrl.rows.length > 0) {

            const existingShortCode = existingUrl.rows[0].short_code;

            return res.json({
                shortCode: existingShortCode,
                shortUrl: `http://localhost:3000/${existingShortCode}`,
                message: "This URL already exists"
            });
        }


        // ==================================================
        // AUTOMATIC BASE62 SHORT CODE
        // ==================================================

        // Insert temporary value to get database ID
        const result = await pool.query(
            "INSERT INTO urls (long_url, short_code) VALUES ($1, $2) RETURNING id",
            [longUrl, "temp"]
        );


        // Get database ID
        const id = result.rows[0].id;


        // Convert ID to Base62
        const shortCode = encodeBase62(id);


        // Update database with generated short code
        await pool.query(
            "UPDATE urls SET short_code = $1 WHERE id = $2",
            [shortCode, id]
        );


        // Send response
        return res.json({
            shortCode: shortCode,
            shortUrl: `http://localhost:3000/${shortCode}`
        });


    } catch (error) {

        console.error(error);


        // PostgreSQL duplicate key error
        if (error.code === "23505") {

            return res.status(409).json({
                error: "Custom alias is already taken"
            });

        }


        return res.status(500).json({
            error: "Failed to shorten URL"
        });
    }
});


// ======================================================
// REDIRECT SHORT URL
// ======================================================

app.get("/:code", async (req, res) => {

    try {

        // Get short code from URL
        const { code } = req.params;


        // Find original URL
        const result = await pool.query(
            "SELECT long_url FROM urls WHERE short_code = $1",
            [code]
        );


        // Short code doesn't exist
        if (result.rows.length === 0) {

            return res.status(404).send(
                "Short URL not found"
            );

        }


        // Get original URL
        const longUrl = result.rows[0].long_url;


        // Log redirect
        console.log(
            "REDIRECT",
            code,
            "->",
            longUrl
        );


        // Redirect user
        res.redirect(longUrl);


    } catch (error) {

        console.error(error);

        res.status(500).send("Server error");

    }
});


// ======================================================
// START SERVER
// ======================================================

app.listen(3000, () => {

    console.log(
        "Server running on http://localhost:3000"
    );

});