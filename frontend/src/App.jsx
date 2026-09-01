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

    const [editingCode, setEditingCode] = useState(null);
    const [editUrl, setEditUrl] = useState("");

    // ==========================================
    // LOAD ALL URLS
    // ==========================================
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

    // ==========================================
    // LOAD URLS WHEN PAGE OPENS
    // ==========================================
    useEffect(() => {
        loadUrls();
    }, []);

    // ==========================================
    // CREATE SHORT URL
    // ==========================================
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

            setMessage("Short URL created successfully!");

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

    // ==========================================
    // COPY SHORT URL
    // ==========================================
    const copyUrl = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setMessage("Short URL copied!");
        } catch {
            setError("Unable to copy URL");
        }
    };

    // ==========================================
    // DELETE URL
    // ==========================================
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

            await loadUrls();
        } catch (error) {
            setError(error.message || "Failed to delete URL");
        }
    };

    // ==========================================
    // START EDITING
    // ==========================================
    const startEdit = (url) => {
        setEditingCode(url.shortCode);
        setEditUrl(url.longUrl);
        setError("");
        setMessage("");
    };

    // ==========================================
    // CANCEL EDIT
    // ==========================================
    const cancelEdit = () => {
        setEditingCode(null);
        setEditUrl("");
    };

    // ==========================================
    // UPDATE URL
    // ==========================================
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

    // ==========================================
    // FORMAT DATE
    // ==========================================
    const formatDate = (date) => {
        if (!date) {
            return "Never";
        }

        return new Date(date).toLocaleString();
    };

    // ==========================================
    // CHECK EXPIRATION
    // ==========================================
    const isExpired = (expiresAt) => {
        if (!expiresAt) {
            return false;
        }

        return new Date(expiresAt) <= new Date();
    };

    // ==========================================
    // TOTAL CLICKS
    // ==========================================
    const totalClicks = urls.reduce(
        (total, url) => total + Number(url.clicks || 0),
        0
    );

    return (
        <div className="app">
            {/* =====================================
                HEADER
            ====================================== */}
            <header className="header">
                <div>
                    <h1>URL Shortener</h1>
                    <p>Manage, track and organize your short URLs</p>
                </div>

                <button
                    className="refresh-button"
                    onClick={loadUrls}
                    disabled={loadingUrls}
                >
                    {loadingUrls ? "Refreshing..." : "Refresh"}
                </button>
            </header>

            {/* =====================================
                SUMMARY CARDS
            ====================================== */}
            <section className="summary">
                <div className="summary-card">
                    <span>Total URLs</span>
                    <strong>{urls.length}</strong>
                </div>

                <div className="summary-card">
                    <span>Total Clicks</span>
                    <strong>{totalClicks}</strong>
                </div>

                <div className="summary-card">
                    <span>Active URLs</span>
                    <strong>
                        {
                            urls.filter(
                                (url) => !isExpired(url.expiresAt)
                            ).length
                        }
                    </strong>
                </div>

                <div className="summary-card">
                    <span>Expired URLs</span>
                    <strong>
                        {
                            urls.filter((url) =>
                                isExpired(url.expiresAt)
                            ).length
                        }
                    </strong>
                </div>
            </section>

            {/* =====================================
                MESSAGES
            ====================================== */}
            {error && <div className="error-message">{error}</div>}

            {message && (
                <div className="success-message">{message}</div>
            )}

            {/* =====================================
                CREATE URL
            ====================================== */}
            <section className="create-card">
                <h2>Create Short URL</h2>

                <div className="form-grid">
                    <div className="input-group">
                        <label>Long URL</label>

                        <input
                            type="text"
                            placeholder="https://www.example.com"
                            value={longUrl}
                            onChange={(e) =>
                                setLongUrl(e.target.value)
                            }
                        />
                    </div>

                    <div className="input-group">
                        <label>Custom Alias</label>

                        <input
                            type="text"
                            placeholder="my-link (optional)"
                            value={customAlias}
                            onChange={(e) =>
                                setCustomAlias(e.target.value)
                            }
                        />
                    </div>

                    <div className="input-group">
                        <label>Expiration</label>

                        <input
                            type="datetime-local"
                            value={expiresAt}
                            onChange={(e) =>
                                setExpiresAt(e.target.value)
                            }
                        />
                    </div>

                    <div className="create-button-container">
                        <button
                            className="primary-button"
                            onClick={shortenUrl}
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Shorten URL"}
                        </button>
                    </div>
                </div>
            </section>

            {/* =====================================
                URL LIST
            ====================================== */}
            <section className="urls-section">
                <div className="section-heading">
                    <div>
                        <h2>Your URLs</h2>
                        <p>Manage all your shortened URLs</p>
                    </div>
                </div>

                {loadingUrls ? (
                    <div className="empty-state">
                        <p>Loading URLs...</p>
                    </div>
                ) : urls.length === 0 ? (
                    <div className="empty-state">
                        <h3>No URLs found</h3>
                        <p>Create your first short URL above.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Short URL</th>
                                    <th>Original URL</th>
                                    <th>Clicks</th>
                                    <th>Created</th>
                                    <th>Expires</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {urls.map((url) => {
                                    const expired = isExpired(
                                        url.expiresAt
                                    );

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
                                                {editingCode ===
                                                url.shortCode ? (
                                                    <div className="edit-box">
                                                        <input
                                                            type="text"
                                                            value={editUrl}
                                                            onChange={(e) =>
                                                                setEditUrl(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />

                                                        <div className="edit-actions">
                                                            <button
                                                                className="save-button"
                                                                onClick={() =>
                                                                    updateUrl(
                                                                        url.shortCode
                                                                    )
                                                                }
                                                            >
                                                                Save
                                                            </button>

                                                            <button
                                                                className="cancel-button"
                                                                onClick={
                                                                    cancelEdit
                                                                }
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span
                                                        className="long-url"
                                                        title={url.longUrl}
                                                    >
                                                        {url.longUrl}
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                <span className="click-count">
                                                    {url.clicks || 0}
                                                </span>
                                            </td>

                                            <td>
                                                {formatDate(
                                                    url.createdAt
                                                )}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    url.expiresAt
                                                )}
                                            </td>

                                            <td>
                                                {expired ? (
                                                    <span className="status expired">
                                                        Expired
                                                    </span>
                                                ) : (
                                                    <span className="status active">
                                                        Active
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                <div className="actions">
                                                    <button
                                                        className="copy-button"
                                                        onClick={() =>
                                                            copyUrl(
                                                                url.shortUrl
                                                            )
                                                        }
                                                    >
                                                        Copy
                                                    </button>

                                                    <button
                                                        className="edit-button"
                                                        onClick={() =>
                                                            startEdit(url)
                                                        }
                                                        disabled={
                                                            editingCode ===
                                                            url.shortCode
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="delete-button"
                                                        onClick={() =>
                                                            deleteUrl(
                                                                url.shortCode
                                                            )
                                                        }
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
                )}
            </section>
        </div>
    );
}

export default App;