# Subscription Management Tool

A simple, local-first subscription management tool to keep track of your recurring expenses.

## Features

- Add, edit, and delete subscriptions
- Dashboard with spending overview and category breakdown
- View upcoming renewal dates
- Filter by status, category, or search term
- Light and dark mode

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express
- **Database:** SQLite (via `better-sqlite3`)
- **State Management:** Zustand

## Local-First Architecture

This application runs entirely on your local machine. The frontend is a standard React application, and the backend is a simple Node.js/Express server that interacts with a local SQLite database file.

To protect write operations (creating, updating, deleting), the backend requires an API key. You can set this key in the application's settings page, and it will be stored in your browser's local storage.

## Setup and Installation

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### 2. Frontend Setup

```bash
# 1. Navigate to the project root and install dependencies
npm install

# 2. Run the frontend development server
npm run dev
```
The frontend will be available at `http://localhost:5173`.

### 3. Backend Setup

```bash
# 1. In a new terminal, navigate to the server directory
cd server

# 2. Install backend dependencies
npm install

# 3. Initialize the database (only needs to be done once)
# This creates the database.sqlite file and sets up the tables.
node db/init.js

# 4. Start the backend server
npm start
```
The backend server will run on `http://localhost:3000`.

### 4. Configure API Key

1.  Open the application in your browser (`http://localhost:5173`).
2.  Navigate to the "Settings" page.
3.  Enter a secret API key of your choice and save it. This key will be used to authorize changes you make in the app. The key is stored only in your browser.
