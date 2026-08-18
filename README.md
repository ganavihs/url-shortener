# 🔗 URL Shortener

A simple full-stack URL shortener built using **React, Node.js, Express, and PostgreSQL**.

The application takes a long URL and generates a short URL. When the short URL is opened, it redirects the user to the original URL.

This project was built to understand how a frontend, backend, database, URL encoding, and HTTP redirects work together.

---

## 🚀 Features

- Shorten long URLs
- Generate short codes using Base62 encoding
- Store URLs in PostgreSQL
- Redirect short URLs to the original URL
- React frontend
- Node.js and Express backend
- REST API
- CORS support

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
│   ├── check_db_e.js
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

GET /health

Checks whether the server and database are working.

### Create Short URL

POST /api/shorten

Request:

{
  "longUrl": "https://www.google.com"
}

Response:

{
  "shortCode": "a",
  "shortUrl": "http://localhost:3000/a"
}

### Redirect

GET /:code

Example:

http://localhost:3000/a

This redirects the user to the original URL.

---

## 🗄️ Database

The project uses PostgreSQL to store the URLs.

The main table contains:

| Column | Description |
|---|---|
| id | Unique ID |
| short_code | Generated short code |
| long_url | Original URL |
| created_at | URL creation time |

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

- [x] URL shortening
- [x] PostgreSQL integration
- [x] Base62 encoding
- [x] URL redirection
- [x] React frontend
- [x] REST API
- [x] GitHub repository
- [x] Development branch

### Planned

- [ ] URL validation
- [ ] Custom short aliases
- [ ] Duplicate URL handling
- [ ] Better error handling
- [ ] Link expiry
- [ ] Click analytics
- [ ] Deploy the application

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