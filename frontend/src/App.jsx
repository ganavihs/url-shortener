import { useState } from "react";

function App() {
    const [longUrl, setLongUrl] = useState("");
    const [customAlias, setCustomAlias] = useState("");
    const [shortUrl, setShortUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const shortenUrl = async () => {
        const cleanLongUrl = longUrl.trim();
        const cleanAlias = customAlias.trim();

        if (!cleanLongUrl) {
            setError("Please enter a URL");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setShortUrl("");

            const response = await fetch(
                "http://localhost:3000/api/shorten",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        longUrl: cleanLongUrl,
                        ...(cleanAlias ? { customAlias: cleanAlias } : {}),
                    }),
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(data.error || `Request failed (${response.status})`);
            }

            setShortUrl(data.shortUrl);

        } catch (error) {
            setError(error.message || "Failed to shorten URL");
        } finally {
            setLoading(false);
        }
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(shortUrl);
        alert("Short URL copied!");
    };

    return (
        <div>
            <h1>URL Shortener</h1>

            <input
                type="text"
                placeholder="Enter your long URL"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
            />

            <input
                type="text"
                placeholder="Custom alias (optional)"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
            />

            <button onClick={shortenUrl}>
                {loading ? "Shortening..." : "Shorten URL"}
            </button>

            {error && <p>{error}</p>}

            {shortUrl && (
                <div>
                    <p>Your shortened URL:</p>

                    <a
                        href={shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {shortUrl}
                    </a>

                    <button onClick={copyUrl}>
                        Copy
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;