import { useCallback, useEffect, useState } from "react";
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

    const [urls, setUrls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingUrls, setLoadingUrls] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [createdUrl, setCreatedUrl] = useState(null);
    const [showAllLinks, setShowAllLinks] = useState(false);

    // Search and filtering state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "expired"

    // Toast notification state
    const [toasts, setToasts] = useState([]);

    // Copy feedback state (tracks the specific shortCode or "created" that was copied)
    const [copiedCode, setCopiedCode] = useState(null);

    // Editing state (supports both URL and expiration date)
    const [editingCode, setEditingCode] = useState(null);
    const [editUrl, setEditUrl] = useState("");
    const [editExpiresAt, setEditExpiresAt] = useState("");
    const [updating, setUpdating] = useState(false);

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

    const loadUrls = useCallback(async () => {
        try {
            setLoadingUrls(true);
            const response = await fetch(`${API_URL}/api/urls`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load URLs");
            }

            setUrls(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast("error", error.message || "Failed to load URLs");
        } finally {
            setLoadingUrls(false);
        }
    }, []);

    const handleRefresh = async () => {
        if (isRefreshing || loadingUrls) return;
        setIsRefreshing(true);
        const startTime = Date.now();
        try {
            await loadUrls();
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 500 - elapsed);
            setTimeout(() => {
                setIsRefreshing(false);
            }, remaining);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchUrls = async () => {
            try {
                setLoadingUrls(true);
                const response = await fetch(`${API_URL}/api/urls`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to load URLs");
                }

                if (isMounted) {
                    setUrls(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (isMounted) {
                    showToast("error", error.message || "Failed to load URLs");
                }
            } finally {
                if (isMounted) {
                    setLoadingUrls(false);
                }
            }
        };

        fetchUrls();

        return () => {
            isMounted = false;
        };
    }, []);

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
            await loadUrls();
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

    const deleteUrl = async (shortCode) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${shortCode}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
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

            showToast("success", "Short URL deleted successfully!");

            if (createdUrl && createdUrl.shortCode === shortCode) {
                setCreatedUrl(null);
            }

            await loadUrls();
        } catch (error) {
            showToast("error", error.message || "Failed to delete URL");
        }
    };

    const startEdit = (url) => {
        setEditingCode(url.shortCode);
        setEditUrl(url.longUrl);
        if (url.expiresAt) {
            const d = new Date(url.expiresAt);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            setEditExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
        } else {
            setEditExpiresAt("");
        }
    };

    const cancelEdit = () => {
        setEditingCode(null);
        setEditUrl("");
        setEditExpiresAt("");
    };

    const updateUrl = async (shortCode) => {
        const cleanUrl = editUrl.trim();

        if (!cleanUrl) {
            showToast("error", "Please enter a valid destination URL");
            return;
        }

        try {
            setUpdating(true);

            const body = {
                longUrl: cleanUrl,
            };

            if (editExpiresAt) {
                body.expiresAt = new Date(editExpiresAt).toISOString();
            } else {
                body.expiresAt = null;
            }

            const response = await fetch(
                `${API_URL}/api/urls/${encodeURIComponent(shortCode)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update URL");
            }

            showToast("success", "Short URL updated successfully!");
            setEditingCode(null);
            setEditUrl("");
            setEditExpiresAt("");

            await loadUrls();
        } catch (error) {
            showToast("error", error.message || "Failed to update URL");
        } finally {
            setUpdating(false);
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

    // Calculate dynamic stats from real urls
    const totalClicks = urls.reduce(
        (total, url) => total + Number(url.clicks || 0),
        0
    );

    const activeCount = urls.filter(
        (url) => !isExpired(url.expiresAt)
    ).length;

    const expiredCount = urls.filter(
        (url) => isExpired(url.expiresAt)
    ).length;

    // Filter urls according to search query and status tab
    const filteredUrls = urls.filter((url) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
            !query ||
            url.shortCode.toLowerCase().includes(query) ||
            url.longUrl.toLowerCase().includes(query);

        if (!matchesSearch) return false;

        if (statusFilter === "active") {
            return !isExpired(url.expiresAt);
        } else if (statusFilter === "expired") {
            return isExpired(url.expiresAt);
        }
        return true;
    });

    const recentLinks = filteredUrls.slice(0, 4);
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
                                className={`secondary-button refresh-btn ${isRefreshing ? "refreshing" : ""}`}
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                type="button"
                                title="Refresh links and statistics"
                            >
                                <span className={`refresh-icon ${isRefreshing ? "spin" : ""}`} aria-hidden="true">
                                    ↻
                                </span>
                                {isRefreshing ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="quick-stats">
                            <div className="quick-stat">
                                <span className="stat-label">Links</span>
                                <strong>{urls.length}</strong>
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
                        <div>
                            <h2>My Links</h2>
                            <p>Manage, track, and edit your shortened links in one place.</p>
                        </div>

                        {urls.length > 0 && (
                            <button
                                type="button"
                                className="view-all-button"
                                onClick={() => setShowAllLinks((current) => !current)}
                            >
                                {showAllLinks ? "Hide full table" : "View full table"}
                                <span>{showAllLinks ? "↑" : "↓"}</span>
                            </button>
                        )}
                    </div>

                    {/* Search & Status Filter Toolbar */}
                    {urls.length > 0 && (
                        <div className="links-toolbar">
                            <div className="search-box">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search by short code or original URL..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        className="search-clear-btn"
                                        onClick={() => setSearchQuery("")}
                                        title="Clear search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            <div className="status-filter-group" role="tablist" aria-label="Filter links by status">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={statusFilter === "all"}
                                    className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
                                    onClick={() => setStatusFilter("all")}
                                >
                                    All ({urls.length})
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={statusFilter === "active"}
                                    className={`filter-btn ${statusFilter === "active" ? "active" : ""}`}
                                    onClick={() => setStatusFilter("active")}
                                >
                                    Active ({activeCount})
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={statusFilter === "expired"}
                                    className={`filter-btn ${statusFilter === "expired" ? "active" : ""}`}
                                    onClick={() => setStatusFilter("expired")}
                                >
                                    Expired ({expiredCount})
                                </button>
                            </div>
                        </div>
                    )}

                    {loadingUrls ? (
                        <div className="empty-state">
                            <div className="loading-orbit">V</div>
                            <h3>Loading your links...</h3>
                        </div>
                    ) : urls.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔗</div>
                            <h3>No short links yet</h3>
                            <p>Paste a long URL above to create your first short link and start tracking clicks.</p>
                        </div>
                    ) : filteredUrls.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔍</div>
                            <h3>No matching links found</h3>
                            <p>Try adjusting your search query or switching the status filter.</p>
                        </div>
                    ) : (
                        <>
                            <div className="recent-list">
                                {recentLinks.map((url, index) => {
                                    const expired = isExpired(url.expiresAt);
                                    const isCopied = copiedCode === url.shortCode;

                                    return (
                                        <div key={url.shortCode} className="recent-item">
                                            <div className="recent-left">
                                                <div className="recent-index">0{index + 1}</div>

                                                <div className="recent-main">
                                                    <div className="recent-top-row">
                                                        <a
                                                            href={getShortUrl(url)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="short-link"
                                                        >
                                                            {url.shortCode}
                                                        </a>
                                                        <span className={`status ${expired ? "expired" : "active"}`}>
                                                            <span />
                                                            {expired ? "Expired" : "Active"}
                                                        </span>
                                                    </div>

                                                    <span className="recent-url" title={url.longUrl}>
                                                        {url.longUrl}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="recent-right">
                                                <div className="recent-click-info">
                                                    <strong>{url.clicks || 0}</strong>
                                                    <span>clicks</span>
                                                </div>

                                                <button
                                                    type="button"
                                                    className={`copy-button ${isCopied ? "copied" : ""}`}
                                                    onClick={() => copyUrl(getShortUrl(url), url.shortCode)}
                                                >
                                                    {isCopied ? "Copied! ✓" : "Copy"}
                                                </button>
                                            </div>
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

                                        <span className="link-count">
                                            Showing {filteredUrls.length} of {urls.length} links
                                        </span>
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
                                                {filteredUrls.map((url) => {
                                                    const expired = isExpired(url.expiresAt);
                                                    const isEditing = editingCode === url.shortCode;
                                                    const isCopied = copiedCode === url.shortCode;

                                                    return (
                                                        <tr key={url.shortCode}>
                                                            <td>
                                                                <a
                                                                    href={getShortUrl(url)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="short-link"
                                                                    title={url.shortCode}
                                                                >
                                                                    {url.shortCode}
                                                                </a>
                                                            </td>

                                                            <td>
                                                                {isEditing ? (
                                                                    <div className="edit-box">
                                                                        <div className="edit-field">
                                                                            <label>Destination URL</label>
                                                                            <input
                                                                                type="text"
                                                                                value={editUrl}
                                                                                placeholder="https://..."
                                                                                onChange={(e) => setEditUrl(e.target.value)}
                                                                            />
                                                                        </div>

                                                                        <div className="edit-field">
                                                                            <label>Expiration (Optional)</label>
                                                                            <div className="edit-date-wrapper">
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    min={minDateTime}
                                                                                    value={editExpiresAt}
                                                                                    onChange={(e) => setEditExpiresAt(e.target.value)}
                                                                                />
                                                                                {editExpiresAt && (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="clear-date-btn"
                                                                                        onClick={() => setEditExpiresAt("")}
                                                                                        title="Remove expiration date"
                                                                                    >
                                                                                        Clear
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="edit-actions">
                                                                            <button
                                                                                type="button"
                                                                                className="save-button"
                                                                                onClick={() => updateUrl(url.shortCode)}
                                                                                disabled={updating}
                                                                            >
                                                                                {updating ? "Saving..." : "Save"}
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                className="cancel-button"
                                                                                onClick={cancelEdit}
                                                                                disabled={updating}
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
                                                                        type="button"
                                                                        className={`copy-button ${isCopied ? "copied" : ""}`}
                                                                        onClick={() => copyUrl(getShortUrl(url), url.shortCode)}
                                                                    >
                                                                        {isCopied ? "Copied! ✓" : "Copy"}
                                                                    </button>

                                                                    {!isEditing && (
                                                                        <button
                                                                            type="button"
                                                                            className="edit-button"
                                                                            onClick={() => startEdit(url)}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        type="button"
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
