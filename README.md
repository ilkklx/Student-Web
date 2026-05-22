# Student Management System

A full-stack web application for managing students, courses, enrollments, and user roles.
Built with Spring Boot 3 (Java) on the backend and React 19 with Vite on the frontend.

---

## Overview

This project supports three roles — Admin, Teacher, and Student — each with their own
dashboard and permissions. It includes JWT-based authentication, soft delete with a
recycle bin, profile photo uploads, CSV export, and full light/dark mode support.

---

## Features

### Admin
- Dashboard with live stats (students, courses, enrollments)
- Full CRUD on students and courses
- Enrollment management (assign and drop students)
- Bulk delete and restore (soft delete with recycle bin)
- Export student list to CSV
- Upload student profile photos

### Teacher
- Teacher dashboard with quick links
- View class roster (read-only)
- Browse courses and manage enrollments

### Student
- Student dashboard with progress rings and upcoming deadlines
- View and drop own courses
- Upload and edit profile picture
- Link personal student record by searching name

### General
- JWT authentication with role-based access
- Light and dark mode (persisted in localStorage)
- Responsive design for desktop, tablet, and mobile

---

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Backend    | Spring Boot 3, Spring Security, JWT, Hibernate          |
| Frontend   | React 19, Vite, Tailwind CSS v4, React Router 7         |
| State      | TanStack Query (React Query), Axios                     |
| UI         | Tailwind CSS v4, Heroicons, Recharts, React Toastify    |
| Forms      | React Hook Form + Yup                                   |
| Database   | MySQL (production) / H2 (development)                   |
| Build      | Maven (backend), npm (frontend)                         |

---

## Project Structure
student-management-system/
├── studentms-backend/
│   ├── src/main/java/...
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── import.sql
│   │   └── data.sql
│   └── pom.xml
├── studentms-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layout/
│   │   ├── pages/
│   │   └── lib/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
└── README.md

---

## Getting Started

### Prerequisites
- Java 17 or higher
- Node.js 18 and npm
- MySQL (for production) — not required if using H2

### 1. Clone the repository

```bash
git clone https://github.com/nagavenkatavalli/student-management-system.git
cd student-management-system
```

### 2. Backend setup

#### Option A — H2 (in-memory, no database required)

```bash
cd studentms-backend
# In application.properties, set:
# spring.profiles.active=h2
./mvnw spring-boot:run
```

#### Option B — MySQL

Create a database named `student_db`, then update `application.properties`:

```properties
spring.profiles.active=mysql
spring.datasource.url=jdbc:mysql://localhost:3306/student_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=your_password
```

```bash
./mvnw spring-boot:run
```

Backend runs on `http://localhost:8080`.  
Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. Initial role setup

On a fresh database, insert the required roles:

```sql
INSERT INTO roles (name) VALUES ('ROLE_ADMIN'), ('ROLE_TEACHER'), ('ROLE_STUDENT');
```

If you are using `ddl-auto=create`, the included `import.sql` handles this automatically.  
For H2, the console is available at `http://localhost:8080/h2-console`.

### 4. Frontend setup

```bash
cd studentms-frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:8080/api in .env
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Running the App

1. Start the backend and wait for "Started StudentmsBackendApplication"
2. Start the frontend with `npm run dev`
3. Open `http://localhost:5173`
4. Register a user with `ROLE_ADMIN` to get started

---

## API Endpoints

| Method | Endpoint                          | Description                  | Access              |
|--------|-----------------------------------|------------------------------|---------------------|
| POST   | /api/auth/login                   | Login, returns JWT and role  | Public              |
| POST   | /api/auth/register                | Register admin or teacher    | Public              |
| POST   | /api/auth/register/student        | Register with student details| Public              |
| GET    | /api/dashboard/stats              | Dashboard stats              | Admin               |
| GET    | /api/students                     | Paginated student list       | Admin, Teacher      |
| POST   | /api/students                     | Create student               | Admin               |
| PUT    | /api/students/{id}                | Update student               | Admin               |
| DELETE | /api/students/{id}                | Soft delete student          | Admin               |
| POST   | /api/students/{id}/photo          | Upload profile photo         | Admin, Student      |
| GET    | /api/students/deleted             | List soft-deleted students   | Admin               |
| PATCH  | /api/students/{id}/restore        | Restore deleted student      | Admin               |
| GET    | /api/students/export/csv          | Export students to CSV       | Admin               |
| GET    | /api/courses                      | List all courses             | Authenticated       |
| POST   | /api/courses                      | Create course                | Admin               |
| GET    | /api/students/{id}/courses        | Courses for a student        | Admin, Teacher      |
| POST   | /api/students/{id}/enroll         | Enroll student in course     | Admin, Teacher      |
| DELETE | /api/students/{id}/enroll/{cid}   | Drop a course                | Admin, Teacher, Student (self) |

Full OpenAPI spec available at `/swagger-ui.html` after backend starts.

---

## Environment Variables

### Backend (`application.properties`)

| Property                  | Description                        |
|---------------------------|------------------------------------|
| spring.profiles.active    | `h2` or `mysql`                    |
| jwt.secret                | Secret key for signing JWT tokens  |
| jwt.expiration            | Token expiry in ms (default 86400000 = 1 day) |
| file.upload-dir           | Directory for storing profile photos |

### Frontend (`.env`)
VITE_API_BASE_URL=http://localhost:8080/api

---

## License

This project is licensed under the MIT License.

---

## Author

Naga venkata Valli  
GitHub: [nagavenkatavalli](https://github.com/nagavenkatavalli)  
Repository: [student-management-system](https://github.com/nagavenkatavalli/student-management-system)
