# 🔗 URL Shortener

A simple full-stack URL shortener built using **React, Node.js, Express, and PostgreSQL**.

The application takes a long URL and generates a short URL. When the short URL is opened, it redirects the user to the original URL.

This project was built to understand how a frontend, backend, database, URL encoding, and HTTP redirects work together.

---

## 🚀 Features

- ✅ Shorten long URLs
- ✅ Generate short codes using Base62 encoding
- ✅ Store URLs in PostgreSQL
- ✅ Redirect short URLs to the original URL
- ✅ URL validation (valid URL format checking)
- ✅ Custom short aliases (user-defined short codes)
- ✅ Duplicate URL handling (detect and reuse existing URLs)
- ✅ Link expiration (set expiry dates on URLs)
- ✅ Click analytics (track number of clicks per URL)
- ✅ URL management dashboard
- ✅ Edit URL destination
- ✅ Delete URLs
- ✅ Copy short URL to clipboard
- ✅ React frontend with dark mode support
- ✅ Node.js and Express backend
- ✅ REST API with comprehensive error handling
- ✅ CORS support
- ✅ Responsive design (mobile, tablet, desktop)

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Encoding:** Base62
- **Version Control:** Git + GitHub

---

## ⚙️ How It Works

1. The user enters a long URL.
2. The React frontend sends the URL to the backend.
3. The backend stores the URL in PostgreSQL.
4. The database generates a unique ID.
5. The ID is converted into a short Base62 code.
6. The short code is stored in the database.
7. The backend returns the short URL.
8. When the short URL is opened, the backend finds the original URL and redirects the user.

### Example

Long URL:

https://www.google.com

Short URL:

http://localhost:3000/a

Opening the short URL redirects to:

https://www.google.com

---

## 📁 Project Structure

url-shortener/
│
├── backend/
│   ├── utils/
│   │   └── base62.js
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md

---

## 🔌 API Endpoints

### Health Check
**GET /health**

Checks whether the server and database are working.

**Response:**
```
Server and database are working!
```

---

### Create Short URL
**POST /api/shorten**

Creates a new short URL with optional custom alias and expiration date.

**Request Body:**
```json
{
  "longUrl": "https://www.example.com/very/long/url",
  "customAlias": "my-link",          // optional
  "expiresAt": "2026-12-31T23:59:59Z" // optional, ISO 8601 format
}
```

**Response (Success):**
```json
{
  "shortCode": "my-link",
  "shortUrl": "http://localhost:3000/my-link",
  "expiresAt": "2026-12-31T23:59:59.000Z" // optional, only if provided
}
```

**Response (Existing URL):**
```json
{
  "shortCode": "existing-code",
  "shortUrl": "http://localhost:3000/existing-code",
  "message": "This URL already exists",
  "expiresAt": "2026-12-31T23:59:59.000Z" // optional
}
```

**Error Responses:**
- `400 Bad Request` - Missing longUrl, invalid URL format, or invalid expiration date
- `409 Conflict` - Custom alias already taken

---

### List All URLs
**GET /api/urls**

Retrieves all shortened URLs ordered by creation date (newest first).

**Response:**
```json
[
  {
    "shortCode": "a",
    "shortUrl": "http://localhost:3000/a",
    "longUrl": "https://www.google.com",
    "clicks": 5,
    "createdAt": "2026-09-01T10:00:00.000Z",
    "expiresAt": null
  },
  {
    "shortCode": "b",
    "shortUrl": "http://localhost:3000/b",
    "longUrl": "https://www.github.com",
    "clicks": 12,
    "createdAt": "2026-09-01T10:05:00.000Z",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
]
```

**Error Responses:**
- `500 Internal Server Error` - Database error

---

### Update URL
**PUT /api/urls/:code**

Updates the destination URL of an existing short URL.

**Request:**
```
PUT /api/urls/a
Content-Type: application/json

{
  "longUrl": "https://www.newurl.com",
  "expiresAt": "2026-12-31T23:59:59Z" // optional
}
```

**Response:**
```json
{
  "message": "Short URL updated successfully",
  "shortCode": "a",
  "shortUrl": "http://localhost:3000/a",
  "longUrl": "https://www.newurl.com",
  "clicks": 5,
  "createdAt": "2026-09-01T10:00:00.000Z",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid URL or expiration date
- `404 Not Found` - Short URL not found

---

### Delete URL
**DELETE /api/urls/:code**

Deletes a shortened URL.

**Request:**
```
DELETE /api/urls/a
```

**Response:**
```json
{
  "message": "Short URL deleted successfully",
  "shortCode": "a"
}
```

**Error Responses:**
- `404 Not Found` - Short URL not found

---

### Get URL Statistics
**GET /api/stats/:code**

Retrieves statistics for a specific shortened URL.

**Request:**
```
GET /api/stats/a
```

**Response:**
```json
{
  "shortCode": "a",
  "shortUrl": "http://localhost:3000/a",
  "longUrl": "https://www.google.com",
  "clicks": 5,
  "createdAt": "2026-09-01T10:00:00.000Z",
  "expiresAt": null
}
```

**Error Responses:**
- `404 Not Found` - Short URL not found

---

### Redirect to Original URL
**GET /:code**

Redirects to the original URL and increments the click count (if not expired).

**Request:**
```
GET /a
```

**Response:**
- `302 Found` - Redirects to the original long URL
- `404 Not Found` - Short URL not found
- `410 Gone` - Short URL has expired

---

## Error Handling

All endpoints return appropriate HTTP status codes and JSON error messages:

- `400 Bad Request` - Invalid input (missing fields, invalid format)
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists (e.g., duplicate alias)
- `410 Gone` - Resource has expired
- `500 Internal Server Error` - Server or database error

Example error response:
```json
{
  "error": "Please enter a valid URL"
}
```

---

## 🗄️ Database

The project uses PostgreSQL to store the URLs.

### Database Schema

| Column | Type | Description |
|---|---|---|
| id | INTEGER | Unique identifier (primary key, auto-increment) |
| short_code | VARCHAR(255) | Generated or custom short code (unique) |
| long_url | TEXT | Original long URL |
| clicks | INTEGER | Number of times the short URL was accessed (default: 0) |
| created_at | TIMESTAMP | URL creation timestamp (default: now) |
| expires_at | TIMESTAMP | URL expiration timestamp (nullable) |

### Key Features
- Each URL is uniquely identified by its short_code
- Click count is automatically incremented when a short URL is accessed
- Expired URLs return HTTP 410 Gone instead of redirecting
- Duplicate long URLs return the existing short code (if not expired)
- Custom aliases must be unique and follow alphanumeric format (letters, numbers, hyphens, underscores)

---

## 🏁 How to Run Locally

### Prerequisites

- Node.js
- PostgreSQL
- Git

### 1. Clone the repository

git clone https://github.com/gganavihs-blip/url-shortener.git

cd url-shortener

### 2. Start the Backend

cd backend

npm install

Create a `.env` file inside the `backend` folder:

DATABASE_URL=your_postgresql_connection_string

Start the server:

node index.js

The backend will run at:

http://localhost:3000

### 3. Start the Frontend

Open another terminal:

cd frontend

npm install

npm run dev

The frontend will run at:

http://localhost:5173

---

## 🌱 Git Workflow

The project uses two main branches:

main
↓
Stable version

develop
↓
Development version

New features are developed and tested on the `develop` branch before being merged into `main`.

---

## 🗺️ Roadmap

### Completed

- [x] URL shortening with Base62 encoding
- [x] PostgreSQL integration
- [x] URL validation (URL format checking)
- [x] Custom short aliases (user-defined codes)
- [x] Duplicate URL handling (detect and reuse)
- [x] URL redirection
- [x] Click analytics (click counting and statistics)
- [x] Link expiration (expiry date support)
- [x] URL dashboard (React UI)
- [x] CRUD operations (Create, Read, Update, Delete)
- [x] Copy to clipboard functionality
- [x] React frontend with Vite
- [x] Node.js and Express backend
- [x] REST API with error handling
- [x] CORS support
- [x] Dark mode support
- [x] Responsive design
- [x] GitHub repository
- [x] Development workflow (main/develop branches)

### Future Enhancements

- [ ] User authentication and account management
- [ ] URL preview before redirect
- [ ] QR code generation
- [ ] Advanced analytics (geo-location, device info, referrer tracking)
- [ ] Bulk URL creation
- [ ] Custom branding
- [ ] API key authentication
- [ ] Deployment to cloud (AWS, Heroku, Vercel, etc.)

---

## 🧠 What I Learned

Through this project, I learned:

- How to build a REST API using Express
- How to connect Node.js with PostgreSQL
- How to store and retrieve data from a database
- How Base62 encoding can be used to generate short codes
- How HTTP redirects work
- How React communicates with a backend API
- How to handle CORS
- How to use environment variables
- How to use Git and GitHub
- How to work with main and develop branches

---

## 📄 License

This project is licensed under the MIT License.