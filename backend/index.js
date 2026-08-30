const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();
const cors = require("cors");

const encodeBase62 = require("./utils/base62");

const app = express();

// ======================================================
// CORS
// ======================================================

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ]
    })
);

// ======================================================
// REQUEST LOGGER
// ======================================================

app.use((req, res, next) => {
    console.log("INCOMING", req.method, req.url);
    next();
});

// ======================================================
// PARSE JSON
// ======================================================

app.use(express.json());

// ======================================================
// POSTGRESQL CONNECTION
// ======================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ======================================================
// HEALTH CHECK
// ======================================================

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

        // --------------------------------------------------
        // GET REQUEST DATA
        // --------------------------------------------------

        const longUrl =
            typeof req.body?.longUrl === "string"
                ? req.body.longUrl.trim()
                : "";

        const customAlias =
            typeof req.body?.customAlias === "string"
                ? req.body.customAlias.trim()
                : "";

        const expiresAt =
            typeof req.body?.expiresAt === "string"
                ? req.body.expiresAt.trim()
                : "";

        // --------------------------------------------------
        // CHECK LONG URL
        // --------------------------------------------------

        if (!longUrl) {
            return res.status(400).json({
                error: "longUrl is required"
            });
        }

        // --------------------------------------------------
        // URL VALIDATION
        // --------------------------------------------------

        try {
            new URL(longUrl);

        } catch {
            return res.status(400).json({
                error: "Please enter a valid URL"
            });
        }

        // --------------------------------------------------
        // EXPIRATION DATE VALIDATION
        // --------------------------------------------------

        let expirationDate = null;

        if (expiresAt) {

            expirationDate = new Date(expiresAt);

            // Check whether date is valid
            if (isNaN(expirationDate.getTime())) {

                return res.status(400).json({
                    error: "Please enter a valid expiration date"
                });
            }

            // Expiration must be in the future
            if (expirationDate <= new Date()) {

                return res.status(400).json({
                    error: "Expiration date must be in the future"
                });
            }
        }

        // ==================================================
        // CUSTOM ALIAS
        // ==================================================

        if (customAlias) {

            // ------------------------------------------------
            // ALIAS LENGTH
            // ------------------------------------------------

            if (customAlias.length > 50) {

                return res.status(400).json({
                    error: "Custom alias must be 50 characters or fewer"
                });
            }

            // ------------------------------------------------
            // ALIAS FORMAT
            // ------------------------------------------------

            if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {

                return res.status(400).json({
                    error:
                        "Custom alias can only contain letters, numbers, hyphens, and underscores"
                });
            }

            // ------------------------------------------------
            // CHECK IF ALIAS EXISTS
            // ------------------------------------------------

            const existing = await pool.query(
                "SELECT id FROM urls WHERE short_code = $1",
                [customAlias]
            );

            if (existing.rows.length > 0) {

                return res.status(409).json({
                    error: "Custom alias is already taken"
                });
            }

            // ------------------------------------------------
            // SAVE CUSTOM ALIAS
            // ------------------------------------------------

            await pool.query(
                `INSERT INTO urls
                (long_url, short_code, expires_at)
                VALUES ($1, $2, $3)`,
                [
                    longUrl,
                    customAlias,
                    expirationDate
                ]
            );

            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                shortCode: customAlias,

                shortUrl:
                    `http://localhost:3000/${customAlias}`,

                ...(expirationDate && {
                    expiresAt:
                        expirationDate.toISOString()
                })
            });
        }

        // ==================================================
        // CHECK FOR DUPLICATE URL
        // ==================================================

        const existingUrl = await pool.query(
            `SELECT short_code, expires_at
             FROM urls
             WHERE long_url = $1
             LIMIT 1`,
            [longUrl]
        );

        // --------------------------------------------------
        // URL ALREADY EXISTS
        // --------------------------------------------------

        if (existingUrl.rows.length > 0) {

            const existingShortCode =
                existingUrl.rows[0].short_code;

            const existingExpiresAt =
                existingUrl.rows[0].expires_at;

            return res.json({

                shortCode: existingShortCode,

                shortUrl:
                    `http://localhost:3000/${existingShortCode}`,

                message: "This URL already exists",

                ...(existingExpiresAt && {
                    expiresAt:
                        new Date(existingExpiresAt).toISOString()
                })
            });
        }

        // ==================================================
        // AUTOMATIC BASE62 SHORT CODE
        // ==================================================

        // Insert temporary value first
        // so PostgreSQL generates the ID.

        const result = await pool.query(
            `INSERT INTO urls
            (long_url, short_code, expires_at)
            VALUES ($1, $2, $3)
            RETURNING id`,
            [
                longUrl,
                "temp",
                expirationDate
            ]
        );

        // --------------------------------------------------
        // GET DATABASE ID
        // --------------------------------------------------

        const id = result.rows[0].id;

        // --------------------------------------------------
        // CONVERT ID TO BASE62
        // --------------------------------------------------

        const shortCode = encodeBase62(id);

        // --------------------------------------------------
        // UPDATE SHORT CODE
        // --------------------------------------------------

        await pool.query(
            `UPDATE urls
             SET short_code = $1
             WHERE id = $2`,
            [
                shortCode,
                id
            ]
        );

        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.json({

            shortCode: shortCode,

            shortUrl:
                `http://localhost:3000/${shortCode}`,

            ...(expirationDate && {
                expiresAt:
                    expirationDate.toISOString()
            })
        });

    } catch (error) {

        console.error(error);

        // PostgreSQL duplicate key
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
// URL STATISTICS
// ======================================================

app.get("/api/stats/:code", async (req, res) => {

    try {

        // --------------------------------------------------
        // GET SHORT CODE
        // --------------------------------------------------

        const { code } = req.params;

        // --------------------------------------------------
        // FIND URL
        // --------------------------------------------------

        const result = await pool.query(
            `SELECT
                short_code,
                long_url,
                clicks,
                created_at,
                expires_at
             FROM urls
             WHERE short_code = $1`,
            [code]
        );

        // --------------------------------------------------
        // URL NOT FOUND
        // --------------------------------------------------

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Short URL not found"
            });
        }

        // --------------------------------------------------
        // GET DATA
        // --------------------------------------------------

        const url = result.rows[0];

        // --------------------------------------------------
        // RETURN STATISTICS
        // --------------------------------------------------

        return res.json({

            shortCode: url.short_code,

            shortUrl:
                `http://localhost:3000/${url.short_code}`,

            longUrl: url.long_url,

            clicks: url.clicks,

            createdAt: url.created_at,

            expiresAt: url.expires_at
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Failed to fetch URL statistics"
        });
    }
});

// ======================================================
// DELETE SHORT URL
// ======================================================

app.delete("/api/urls/:code", async (req, res) => {

    try {

        // --------------------------------------------------
        // GET SHORT CODE
        // --------------------------------------------------

        const { code } = req.params;

        // --------------------------------------------------
        // DELETE URL
        // --------------------------------------------------

        const result = await pool.query(
            `DELETE FROM urls
             WHERE short_code = $1
             RETURNING short_code`,
            [code]
        );

        // --------------------------------------------------
        // URL NOT FOUND
        // --------------------------------------------------

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Short URL not found"
            });
        }

        // --------------------------------------------------
        // SUCCESS RESPONSE
        // --------------------------------------------------

        return res.json({
            message: "Short URL deleted successfully",
            shortCode: result.rows[0].short_code
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Failed to delete short URL"
        });
    }
});

// ======================================================
// REDIRECT SHORT URL + COUNT CLICKS + EXPIRATION
// ======================================================

app.get("/:code", async (req, res) => {

    try {

        // --------------------------------------------------
        // GET SHORT CODE
        // --------------------------------------------------

        const { code } = req.params;

        // --------------------------------------------------
        // FIND ORIGINAL URL
        // --------------------------------------------------

        const result = await pool.query(
            `SELECT
                long_url,
                clicks,
                expires_at
             FROM urls
             WHERE short_code = $1`,
            [code]
        );

        // --------------------------------------------------
        // SHORT CODE DOESN'T EXIST
        // --------------------------------------------------

        if (result.rows.length === 0) {

            return res.status(404).send(
                "Short URL not found"
            );
        }

        // --------------------------------------------------
        // GET DATA
        // --------------------------------------------------

        const longUrl =
            result.rows[0].long_url;

        const expiresAt =
            result.rows[0].expires_at;

        // ==================================================
        // CHECK EXPIRATION
        // ==================================================

        if (
            expiresAt &&
            new Date(expiresAt) <= new Date()
        ) {

            return res.status(410).send(
                "This short URL has expired"
            );
        }

        // ==================================================
        // INCREMENT CLICK COUNT
        // ==================================================

        await pool.query(
            `UPDATE urls
             SET clicks = clicks + 1
             WHERE short_code = $1`,
            [code]
        );

        // --------------------------------------------------
        // LOG REDIRECT
        // --------------------------------------------------

        console.log(
            "REDIRECT",
            code,
            "->",
            longUrl
        );

        // --------------------------------------------------
        // REDIRECT USER
        // --------------------------------------------------

        res.redirect(longUrl);

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Server error"
        );
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