import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_DOMAIN = API_URL.replace(/^https?:\/\//, "");

// Helper to ensure short URLs point to the live API URL if the backend response contained localhost
const getShortUrl = (urlObj) => {
    if (!urlObj) return "";
    if (urlObj.shortUrl && !urlObj.shortUrl.includes("localhost")) {
        return urlObj.shortUrl;
    }
    return `${API_URL}/${urlObj.shortCode}`;
};

// Helper to get minimum local datetime string (YYYY-MM-DDTHH:MM) for datetime-local inputs
const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function App() {
    const [longUrl, setLongUrl] = useState("");
    const [customAlias, setCustomAlias] = useState("");
    const [expiresAt, setExpiresAt] = useState("");

    const [loading, setLoading] = useState(false);
    const [createdUrl, setCreatedUrl] = useState(null);

    // Toast notification state
    const [toasts, setToasts] = useState([]);

    // Copy feedback state
    const [copiedCode, setCopiedCode] = useState(null);

    const showToast = (type, text) => {
        const id = Date.now() + Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, text }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const shortenUrl = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        const cleanLongUrl = longUrl.trim();
        const cleanAlias = customAlias.trim();

        if (!cleanLongUrl) {
            showToast("error", "Please enter a URL to shorten");
            return;
        }

        try {
            setLoading(true);

            const body = {
                longUrl: cleanLongUrl,
            };

            if (cleanAlias) {
                body.customAlias = cleanAlias;
            }

            if (expiresAt) {
                body.expiresAt = new Date(expiresAt).toISOString();
            }

            const response = await fetch(`${API_URL}/api/shorten`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to shorten URL");
            }

            setCreatedUrl({
                shortCode: data.shortCode || "",
                shortUrl: data.shortUrl || "",
            });

            showToast("success", data.message || "Your short link is ready!");
            setLongUrl("");
            setCustomAlias("");
            setExpiresAt("");
        } catch (error) {
            showToast("error", error.message || "Failed to shorten URL");
        } finally {
            setLoading(false);
        }
    };

    const copyUrl = async (url, code = null) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedCode(code || url);
            showToast("success", "Short URL copied to clipboard!");
            setTimeout(() => {
                setCopiedCode(null);
            }, 2000);
        } catch {
            showToast("error", "Unable to copy URL to clipboard");
        }
    };

    const minDateTime = getMinDateTime();

    return (
        <div className="app-shell">
            {/* Floating Toast Notification Center */}
            <aside className="toast-container" aria-live="polite" aria-label="Notifications">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type}`}
                        role="alert"
                    >
                        <span className="toast-icon">
                            {toast.type === "success" ? "✓" : "!"}
                        </span>
                        <span className="toast-text">{toast.text}</span>
                        <button
                            type="button"
                            className="toast-close"
                            onClick={() => removeToast(toast.id)}
                            aria-label="Dismiss notification"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </aside>

            <header className="topbar">
                <div className="brand-wrap">
                    <div className="brand-mark">
                        <span>V</span>
                    </div>

                    <div className="brand-name">
                        Velora <span>Links</span>
                    </div>
                </div>

                <nav className="topnav" aria-label="Main navigation">
                    <a href="#shorten">Shorten</a>
                    <a href="#how-it-works">How it works</a>
                    <a href="#features">Features</a>
                </nav>

                <div className="header-actions">
                    <a href="#shorten" className="new-link-btn">
                        <span>＋</span>
                        New Link
                    </a>
                </div>
            </header>

            <main className="page-shell">
                <section className="hero-section">
                    <div className="hero-copy">
                        <h1>Turn long URLs into simple, shareable links.</h1>

                        <p>
                            Create custom short links instantly, set optional expiration dates, and share anywhere with one clean interface.
                        </p>

                        <div className="hero-actions">
                            <a href="#shorten" className="primary-button">
                                Create a link
                                <span className="arrow">→</span>
                            </a>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="quick-stats">
                            <div className="quick-stat">
                                <span className="stat-label">Fast & Instant</span>
                                <strong>⚡</strong>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Base62 Safe</span>
                                <strong>🔒</strong>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Custom Aliases</span>
                                <strong>✨</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="shorten" className="create-section">
                    <form className="create-card" onSubmit={shortenUrl}>
                        <div className="url-input-group">
                            <label htmlFor="long-url-input">
                                LONG URL
                            </label>

                            <div className="url-input-row">
                                <div className="url-input-wrapper">
                                    <div className="input-icon" aria-hidden="true">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                        </svg>
                                    </div>

                                    <input
                                        id="long-url-input"
                                        type="url"
                                        placeholder="https://example.com/my-long-url..."
                                        value={longUrl}
                                        onChange={(e) => setLongUrl(e.target.value)}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />

                                    {longUrl && (
                                        <button
                                            type="button"
                                            className="clear-url-btn"
                                            onClick={() => setLongUrl("")}
                                            aria-label="Clear URL"
                                            title="Clear URL"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                <button
                                    className="shorten-action"
                                    disabled={loading}
                                    type="submit"
                                >
                                    {loading ? (
                                        <>
                                            <span className="button-spinner" />
                                            Creating
                                        </>
                                    ) : (
                                        <>
                                            Shorten URL
                                            <span>→</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="advanced-options">
                            <div className="input-group">
                                <label>Custom alias</label>

                                <div className="small-input">
                                    <span>{API_DOMAIN}/</span>
                                    <input
                                        type="text"
                                        placeholder="my-link"
                                        value={customAlias}
                                        onChange={(e) => setCustomAlias(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Expiration (optional)</label>

                                <input
                                    className="date-input"
                                    type="datetime-local"
                                    min={minDateTime}
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                />
                            </div>
                        </div>
                    </form>
                </section>

                {createdUrl && (
                    <section className="result-card">
                        <div className="result-success-icon">✓</div>

                        <div className="result-content">
                            <span>Your short link is ready</span>

                            <a href={getShortUrl(createdUrl)} target="_blank" rel="noreferrer">
                                {getShortUrl(createdUrl)}
                            </a>
                        </div>

                        <div className="result-actions">
                            <button
                                type="button"
                                className={`copy-result ${copiedCode === (createdUrl.shortCode || "created") ? "copied" : ""}`}
                                onClick={() => copyUrl(getShortUrl(createdUrl), createdUrl.shortCode || "created")}
                            >
                                {copiedCode === (createdUrl.shortCode || "created") ? "Copied! ✓" : "Copy link"}
                            </button>

                            <a
                                href={getShortUrl(createdUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="open-result"
                            >
                                Open ↗
                            </a>
                        </div>
                    </section>
                )}

                <section id="how-it-works" className="how-section">
                    <div className="section-header">
                        <h2>How it works</h2>
                    </div>

                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3>Paste your URL</h3>
                            <p>
                                Enter any long link and we'll instantly create a short, shareable version for you.
                            </p>
                        </div>

                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3>Customize (optional)</h3>
                            <p>
                                Add a custom alias and set an expiration date to give your links more personality and control.
                            </p>
                        </div>

                        <div className="step-card">
                            <div className="step-number">3</div>
                            <h3>Share & track</h3>
                            <p>
                                Copy your link and share it anywhere. Clicks are automatically recorded upon every visit.
                            </p>
                        </div>
                    </div>
                </section>

                <section id="features" className="features-section">
                    <div className="section-header">
                        <h2>Why Velora Links</h2>
                        <p>Built for creators and teams who value simplicity, speed, and privacy.</p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">⚙</div>
                            <h3>Simple to use</h3>
                            <p>Create short links in seconds. No complex setup, no accounts required.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🏷</div>
                            <h3>Fully customizable</h3>
                            <p>Choose custom aliases, set expiration dates, and control every detail of your links.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🔒</div>
                            <h3>Private & secure</h3>
                            <p>Your links belong to you. No public tables, tracking pixels, or intrusive ads.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <div className="footer-content">
                    <strong>Velora Links</strong>
                    <span>© 2026. Create and share better links.</span>
                </div>

                <div className="footer-links">
                    <a href="#shorten">Create</a>
                    <a href="#how-it-works">How it works</a>
                    <a href="#features">Features</a>
                </div>
            </footer>
        </div>
    );
}

export default App;
