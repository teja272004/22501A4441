require('dotenv').config();
const express = require('express');
const {Log } = require('../logging-middleware');
const app = express();


const urlDatabase = new Map();
const analyticsDatabase = new Map();

app.use(express.json());


function generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}


app.post('/shorturls', (req, res) => {
    try {
        const { url, validity = 30, shortcode } = req.body;
        
        if (!isValidUrl(url)) {
            Log("backend", "error", "handler", "Invalid URL provided");
            return res.status(400).json({ error: "Invalid URL" });
        }

        const finalShortCode = shortcode || generateShortCode();
        if (urlDatabase.has(finalShortCode)) {
            Log("backend", "error", "handler", "Shortcode collision");
            return res.status(409).json({ error: "Shortcode exists" });
        }

        const expiresAt = new Date(Date.now() + validity * 60000);
        urlDatabase.set(finalShortCode, {
            originalUrl: url,
            shortCode: finalShortCode,
            createdAt: new Date(),
            expiresAt,
            isActive: true
        });

        analyticsDatabase.set(finalShortCode, {
            shortCode: finalShortCode,
            clicks: []
        });

        Log("backend", "info", "service", `Created short URL: ${finalShortCode}`);
        
        res.status(201).json({
            shortLink: `http://${req.get('host')}/${finalShortCode}`,
            expiry: expiresAt.toISOString()
        });
    } catch (err) {
        Log("backend", "fatal", "handler", `Creation error: ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/:shortcode', (req, res) => {
    try {
        const { shortcode } = req.params;
        const urlData = urlDatabase.get(shortcode);

        if (!urlData) {
            Log("backend", "warn", "handler", "Shortcode not found");
            return res.status(404).json({ error: "Not found" });
        }

        if (new Date() > urlData.expiresAt) {
            Log("backend", "warn", "handler", "Expired shortcode");
            return res.status(410).json({ error: "Expired" });
        }

        
        const analytics = analyticsDatabase.get(shortcode);
        analytics.clicks.push({
            timestamp: new Date(),
            referrer: req.get('Referer'),
            ip: req.ip
        });

        Log("backend", "info", "service", `Redirecting: ${shortcode}`);
        res.redirect(urlData.originalUrl);
    } catch (err) {
        Log("backend", "error", "handler", `Redirect error: ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/shorturls/:shortcode', (req, res) => {
    try {
        const { shortcode } = req.params;
        const urlData = urlDatabase.get(shortcode);
        const analytics = analyticsDatabase.get(shortcode);

        if (!urlData || !analytics) {
            Log("backend", "warn", "handler", "Stats not found");
            return res.status(404).json({ error: "Not found" });
        }

        Log("backend", "info", "service", "Retrieved stats");
        res.json({
            originalUrl: urlData.originalUrl,
            createdAt: urlData.createdAt.toISOString(),
            expiresAt: urlData.expiresAt.toISOString(),
            totalClicks: analytics.clicks.length,
            clicks: analytics.clicks
        });
    } catch (err) {
        Log("backend", "error", "handler", `Stats error: ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    Log("backend", "info", "config", `Server running on port ${PORT}`);
});