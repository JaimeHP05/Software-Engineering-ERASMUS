# University Mobility Agreements Portal

## Description

A comprehensive web-based system designed to manage student mobility programs (such as SICUE or Erasmus). The platform facilitates the creation and validation of **Learning Agreements**, streamlining the process for both students and university administrators.

It automates bureaucratic tasks through dynamic **PDF generation**, real-time **email notifications**, and an **AI-powered recommendation engine** for course validation.

## Key Features

### 🎓 Student Module
* **Dashboard:** View the status of all mobility applications (Draft, Approved, Rejected).
* **Create Agreement:** Intuitive form to select destination universities and duration.
* **AI Course Matching:** Intelligent "Auto-Match" button that suggests the best destination course based on text similarity algorithms.
* **Automated Documentation:** Instant generation and download of the official Learning Agreement in PDF format.
* **Notifications:** Receive email updates with attached documents whenever an agreement is created or its status changes.

### 🛠️ Administrator Module
* **Analytics Dashboard:** Visual statistics (Chart.js) showing agreement status distribution and top destinations.
* **Agreement Management:** Search, review, approve, or reject student agreements.
* **Data Management (CRUD):** Full control to create and manage Users, Universities, Degrees, and Courses (including credits and periods).
* **Announcements:** Publish news segmented by target audience (Specific Degree, Specific University, or Global).

### ⚙️ Technical Architecture
* **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript.
* **Backend:** Node.js, Express.js.
* **Database:** SQLite (Relational persistence).
* **Services:**
    * **PDFKit:** Dynamic PDF rendering engine.
    * **Nodemailer:** SMTP Email service integration.
    * **String-Similarity:** Algorithm for course recommendations.

## Prerequisites

* [Node.js](https://nodejs.org/) (v14 or higher)
* npm (Node Package Manager)

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/JaimeHP05/SICUE_304](https://github.com/JaimeHP05/SICUE_304)
    cd SICUE_304
    ```

2.  **Navigate to the backend directory and install dependencies:**
    ```bash
    cd backend
    npm install
    ```
    *This will install express, sqlite3, cors, pdfkit, nodemailer, and string-similarity.*

3.  **Configure Email Credentials (Important):**
    Open `backend/server.js` and locate the `nodemailer` configuration. Update it with your own credentials (or use the provided test ones):
    ```javascript
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
    ```

4.  **Start the Server:**
    ```bash
    npm start
    ```
    *The server will automatically create the `database/agreements.db` file and seed it with initial data if it doesn't exist.*

5.  **Run the Application:**
    Open the `frontend/index.html` file in your web browser (or navigate to `http://localhost:3000` if serving statically).

## Usage / Default Credentials

To test the system, you can use the following pre-configured accounts:

* **Student Account:**
    * Username: `student`
    * Password: `pass123`
* **Administrator Account:**
    * Username: `admin`
    * Password: `admin123`

## Project Structure

```text
├── backend/
│   ├── database/       # SQLite database file (agreements.db)
│   ├── server.js       # Main API, Logic, and DB connection
│   └── package.json    # Backend dependencies
│
└── frontend/
    ├── css/
    │   └── style.css   # Tailwind and custom styles
    ├── js/
    │   └── main.js     # Client-side logic
    └── index.html      # Main user interface
