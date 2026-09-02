import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000";

function App() {
    const [longUrl, setLongUrl] = useState("");
    const [customAlias, setCustomAlias] = useState("");
    const [expiresAt, setExpiresAt] = useState("");

    const [urls, setUrls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingUrls, setLoadingUrls] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [createdUrl, setCreatedUrl] = useState(null);
    const [showAllLinks, setShowAllLinks] = useState(false);

    const [editingCode, setEditingCode] = useState(null);
    const [editUrl, setEditUrl] = useState("");

    const loadUrls = async () => {
        try {
            setLoadingUrls(true);
            setError("");

            const response = await fetch(`${API_URL}/api/urls`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load URLs");
            }

            setUrls(Array.isArray(data) ? data : []);
        } catch (error) {
            setError(error.message || "Failed to load URLs");
        } finally {
            setLoadingUrls(false);
        }
    };

    useEffect(() => {
        loadUrls();
    }, []);

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
            setMessage("");

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

            setMessage("Your short link is ready!");
            setLongUrl("");
            setCustomAlias("");
            setExpiresAt("");
            await loadUrls();
        } catch (error) {
            setError(error.message || "Failed to shorten URL");
        } finally {
            setLoading(false);
        }
    };

    const copyUrl = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setMessage("Short URL copied to clipboard!");
        } catch {
            setError("Unable to copy URL");
        }
    };

    const deleteUrl = async (shortCode) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${shortCode}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setMessage("");

            const response = await fetch(
                `${API_URL}/api/urls/${encodeURIComponent(shortCode)}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to delete URL");
            }

            setMessage("Short URL deleted successfully!");

            if (createdUrl && createdUrl.shortCode === shortCode) {
                setCreatedUrl(null);
            }

            await loadUrls();
        } catch (error) {
            setError(error.message || "Failed to delete URL");
        }
    };

    const startEdit = (url) => {
        setEditingCode(url.shortCode);
        setEditUrl(url.longUrl);
        setError("");
        setMessage("");
    };

    const cancelEdit = () => {
        setEditingCode(null);
        setEditUrl("");
    };

    const updateUrl = async (shortCode) => {
        const cleanUrl = editUrl.trim();

        if (!cleanUrl) {
            setError("Please enter a URL");
            return;
        }

        try {
            setError("");
            setMessage("");

            const response = await fetch(
                `${API_URL}/api/urls/${encodeURIComponent(shortCode)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        longUrl: cleanUrl,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update URL");
            }

            setMessage("Short URL updated successfully!");
            setEditingCode(null);
            setEditUrl("");

            await loadUrls();
        } catch (error) {
            setError(error.message || "Failed to update URL");
        }
    };

    const formatDate = (date) => {
        if (!date) {
            return "Never";
        }

        return new Date(date).toLocaleString();
    };

    const isExpired = (expiresAtValue) => {
        if (!expiresAtValue) {
            return false;
        }

        return new Date(expiresAtValue) <= new Date();
    };

    const fallbackLinks = [
        {
            shortCode: "abc123",
            shortUrl: "https://velora.link/abc123",
            longUrl: "https://www.behance.net",
            clicks: 12,
            expiresAt: null,
        },
        {
            shortCode: "design",
            shortUrl: "https://velora.link/design",
            longUrl: "https://dribbble.com",
            clicks: 8,
            expiresAt: null,
        },
        {
            shortCode: "project",
            shortUrl: "https://velora.link/project",
            longUrl: "https://github.com",
            clicks: 5,
            expiresAt: null,
        },
        {
            shortCode: "docs",
            shortUrl: "https://velora.link/docs",
            longUrl: "https://docs.example.com",
            clicks: 3,
            expiresAt: null,
        },
    ];

    const displayUrls = urls.length > 0 ? urls : fallbackLinks;

    const totalClicks = displayUrls.reduce(
        (total, url) => total + Number(url.clicks || 0),
        0
    );

    const activeCount = displayUrls.filter(
        (url) => !isExpired(url.expiresAt)
    ).length;

    const expiredCount = displayUrls.filter(
        (url) => isExpired(url.expiresAt)
    ).length;

    const recentLinks = [...displayUrls].slice(0, 4);

    return (
        <div className="app-shell">
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
                    <a href="#recent-links">My links</a>
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
                            Create custom short links instantly, set expiration dates, and track click activity in one clean interface.
                        </p>

                        <div className="hero-actions">
                            <a href="#shorten" className="primary-button">
                                Create a link
                                <span className="arrow">→</span>
                            </a>

                            <button
                                className="secondary-button"
                                onClick={loadUrls}
                            >
                                <span className={loadingUrls ? "spin" : ""}>↻</span>
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="quick-stats">
                            <div className="quick-stat">
                                <span className="stat-label">Links</span>
                                <strong>{displayUrls.length}</strong>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Total clicks</span>
                                <strong>{totalClicks}</strong>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Active</span>
                                <strong>{activeCount}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="message-box error-message">
                        <span>!</span>
                        {error}
                    </div>
                )}

                {message && (
                    <div className="message-box success-message">
                        <span>✓</span>
                        {message}
                    </div>
                )}

                <section id="shorten" className="create-section">
                    <div className="create-card">
                        <div className="url-input-wrapper">
                            <div className="input-icon">↗</div>

                            <input
                                type="text"
                                placeholder="Paste your long URL here..."
                                value={longUrl}
                                onChange={(e) => setLongUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        shortenUrl();
                                    }
                                }}
                            />

                            <button
                                className="shorten-action"
                                onClick={shortenUrl}
                                disabled={loading}
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

                        <div className="advanced-options">
                            <div className="input-group">
                                <label>Custom alias</label>

                                <div className="small-input">
                                    <span>velora.link/</span>
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
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {createdUrl && (
                    <section className="result-card">
                        <div className="result-success-icon">✓</div>

                        <div className="result-content">
                            <span>Your short link is ready</span>

                            <a href={createdUrl.shortUrl} target="_blank" rel="noreferrer">
                                {createdUrl.shortUrl}
                            </a>
                        </div>

                        <div className="result-actions">
                            <button
                                className="copy-result"
                                onClick={() => copyUrl(createdUrl.shortUrl)}
                            >
                                Copy link
                            </button>

                            <a
                                href={createdUrl.shortUrl}
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
                                Copy your link and share it anywhere. Watch click counts update in real time.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="features-section">
                    <div className="section-header">
                        <h2>Why Velora Links</h2>
                        <p>Built for creators and teams who value simplicity and reliability.</p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">⚙</div>
                            <h3>Simple to use</h3>
                            <p>Create short links in seconds. No complex setup, no unnecessary features.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🏷</div>
                            <h3>Fully customizable</h3>
                            <p>Choose custom aliases, set expiration dates, and control every detail of your links.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">📊</div>
                            <h3>Real-time insights</h3>
                            <p>Track every click and see exactly how your links perform across channels.</p>
                        </div>
                    </div>
                </section>

                <section id="recent-links" className="recent-section">
                    <div className="section-header">
                        <h2>Your recent links</h2>
                        <button
                            className="view-all-button"
                            onClick={() => setShowAllLinks((current) => !current)}
                        >
                            {showAllLinks ? "Hide all" : "View all"}
                            <span>→</span>
                        </button>
                    </div>

                    {loadingUrls ? (
                        <div className="empty-state">
                            <div className="loading-orbit">V</div>
                            <h3>Loading your links...</h3>
                        </div>
                    ) : (
                        <>
                            <div className="recent-list">
                                {recentLinks.map((url, index) => {
                                    const expired = isExpired(url.expiresAt);

                                    return (
                                        <div key={url.shortCode} className="recent-item">
                                            <div className="recent-index">0{index + 1}</div>

                                            <div className="recent-icon">↗</div>

                                            <div className="recent-main">
                                                <a
                                                    href={url.shortUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="short-link"
                                                >
                                                    {url.shortCode}
                                                </a>

                                                <span className="recent-url" title={url.longUrl}>
                                                    {url.longUrl}
                                                </span>
                                            </div>

                                            <div className="recent-click-info">
                                                <strong>{url.clicks || 0}</strong>
                                                <span>clicks</span>
                                            </div>

                                            <span className={`status ${expired ? "expired" : "active"}`}>
                                                <span />
                                                {expired ? "Expired" : "Active"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {showAllLinks && (
                                <div className="all-links-panel">
                                    <div className="all-links-header">
                                        <div>
                                            <span className="section-label">URL LIBRARY</span>
                                            <h3>All your links</h3>
                                        </div>

                                        <span className="link-count">{urls.length} links</span>
                                    </div>

                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Short URL</th>
                                                    <th>Original URL</th>
                                                    <th>Clicks</th>
                                                    <th>Expires</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {displayUrls.map((url) => {
                                                    const expired = isExpired(url.expiresAt);

                                                    return (
                                                        <tr key={url.shortCode}>
                                                            <td>
                                                                <a
                                                                    href={url.shortUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="short-link"
                                                                >
                                                                    {url.shortCode}
                                                                </a>
                                                            </td>

                                                            <td>
                                                                {editingCode === url.shortCode ? (
                                                                    <div className="edit-box">
                                                                        <input
                                                                            type="text"
                                                                            value={editUrl}
                                                                            onChange={(e) => setEditUrl(e.target.value)}
                                                                        />

                                                                        <div className="edit-actions">
                                                                            <button
                                                                                className="save-button"
                                                                                onClick={() => updateUrl(url.shortCode)}
                                                                            >
                                                                                Save
                                                                            </button>

                                                                            <button
                                                                                className="cancel-button"
                                                                                onClick={cancelEdit}
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="long-url" title={url.longUrl}>
                                                                        {url.longUrl}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span className="click-count">{url.clicks || 0}</span>
                                                            </td>

                                                            <td>{formatDate(url.expiresAt)}</td>

                                                            <td>
                                                                <span className={`status ${expired ? "expired" : "active"}`}>
                                                                    <span />
                                                                    {expired ? "Expired" : "Active"}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <div className="actions">
                                                                    <button
                                                                        className="copy-button"
                                                                        onClick={() => copyUrl(url.shortUrl)}
                                                                    >
                                                                        Copy
                                                                    </button>

                                                                    <button
                                                                        className="edit-button"
                                                                        onClick={() => startEdit(url)}
                                                                        disabled={editingCode === url.shortCode}
                                                                    >
                                                                        Edit
                                                                    </button>

                                                                    <button
                                                                        className="delete-button"
                                                                        onClick={() => deleteUrl(url.shortCode)}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
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
                    <a href="#recent-links">My links</a>
                </div>
            </footer>
        </div>
    );
}

export default App;
