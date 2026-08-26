# Attendance Management System

A QR-code based attendance tracking system built with Next.js, Prisma, and PostgreSQL. Designed for educational institutions to streamline the attendance process for Admins, Teachers, and Students.

## Features

### Core Features
- **Role-based Access Control**: Admin, Teacher, and Student roles with specific permissions
- **QR Code Attendance**: Teachers generate temporary QR codes that expire after a configured time period
- **Duplicate Prevention**: Database-level constraints prevent marking the same student twice for one session
- **Manual Marking**: Teachers can manually mark attendance for students who couldn't scan
- **Attendance Reports**: Paginated, filterable reports with date-range search
- **Attendance Percentage**: Track attendance percentage per subject and overall
- **Audit Trail**: Complete log of all attendance changes with timestamps and who made them
- **Export**: Download reports as CSV or Excel

### Bonus Features
- QR countdown timer showing time until expiry
- Attendance percentage warnings (below 75%)
- Auto-expiring QR codes
- Unit tests for core functionality

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Node.js, Next.js API Routes
- **Database**: PostgreSQL with Prisma 7 ORM
- **Authentication**: JWT with httpOnly cookies
- **Validation**: Zod schemas on every API route
- **Testing**: Vitest

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/attendance-system.git
cd attendance-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: Your PostgreSQL connection string
  - Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
  - Example: `postgresql://postgres:password@localhost:5432/attendance_db`
- `JWT_SECRET`: Random secret for signing JWTs
  - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `NEXT_PUBLIC_APP_URL`: Base URL of your application (e.g., `http://localhost:3000`)

### 4. Set up the database

```bash
# Generate the Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# Optional: Open Prisma Studio to view your database
npx prisma studio
```

### 5. Start the development server

```bash
npm run dev
```

Visit `http://localhost:3000/login` in your browser.

## Initial Setup

### Creating the First Admin Account

Since there's no public signup, the first admin must be created via the API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin Name","email":"admin@college.edu","password":"SecurePassword123"}'
```

This account can then create Teachers and Students through the Admin dashboard.

### Sample Credentials

After creation, log in at `/login` with:
- Email: `admin@college.edu`
- Password: (whatever you set during registration)

## Usage

### Admin

- Create and manage Students, Teachers, Sections, and Subjects
- Assign teachers to classes
- Enroll students in subjects
- View system-wide attendance reports
- Export reports as CSV/Excel

Navigate to: `/admin`

### Teacher

- Create attendance sessions for your assigned classes
- View live QR code with countdown timer
- Mark attendance manually for students who couldn't scan
- Update existing records with reasons/notes
- View class-specific reports and per-student percentages
- Export class reports

Navigate to: `/teacher`

### Student

- View your own attendance history
- Check attendance percentage per subject
- See overall attendance status
- Scan QR codes displayed by teacher

Navigate to: `/student`

### Scanning QR Codes

1. Teacher creates a session (generates a QR code)
2. Teacher displays the QR on a projector or device
3. Student scans with their phone camera
4. Browser redirects to `/scan/<token>` which marks attendance
5. Success/error toast notification appears
6. QR automatically "vanishes" for that student (they see the result page)

## API Documentation

### Authentication

- `POST /api/auth/register` - Create first admin account (self-locking)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current session (lightweight)
- `GET /api/auth/profile` - Get full user profile with role-specific data

### Admin CRUD

- `GET/POST /api/admin/sections` - Manage sections
- `GET/POST /api/admin/subjects` - Manage subjects
- `GET/POST /api/admin/teachers` - Create teacher accounts
- `GET/POST /api/admin/students` - Create student accounts
- `GET/POST /api/admin/subject-sections` - Assign teachers to classes
- `GET/POST /api/admin/enrollments` - Enroll students in subjects
- `GET /api/admin/reports` - System-wide reports
- `GET /api/admin/reports/export` - Export as CSV/Excel

### Teacher APIs

- `GET/POST /api/teacher/sessions` - Create and view attendance sessions
- `GET/PATCH /api/teacher/sessions/:id` - Session details and close early
- `POST /api/teacher/attendance` - Manually mark attendance
- `PATCH /api/teacher/attendance/:id` - Update record (writes audit log)
- `GET /api/teacher/reports` - Class-specific reports with filtering
- `GET /api/teacher/reports/summary` - Per-student percentage
- `GET /api/teacher/reports/export` - Export class report

### Student APIs

- `GET /api/student/attendance/scan` - Mark attendance by QR scan
- `GET /api/student/attendance` - View own attendance history
- `GET /api/student/attendance/summary` - Attendance percentage

All APIs use:
- **Authentication**: JWT in httpOnly cookie
- **Authorization**: Role-based access control via `requireRole()`
- **Validation**: Zod schemas on all request bodies
- **Pagination**: `?page=1&pageSize=20`
- **Date Filtering**: `?from=2026-01-01&to=2026-01-31`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Random secret for JWT signing (32+ chars) |
| `JWT_EXPIRES_IN` | No | `7d` | Session expiry time (e.g., `7d`, `24h`) |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Base URL for QR links |
| `QR_EXPIRY_SECONDS` | No | `60` | How long QR codes stay valid |

## Database Schema

Key models:
- **User**: Login accounts (Admin/Teacher/Student)
- **Teacher/Student**: Role-specific profiles linked to User
- **Section**: Class/batch (e.g., "CSE-3A")
- **Subject**: Course (e.g., "Data Structures")
- **SubjectSection**: "Who teaches what to whom" (many-to-many join)
- **Enrollment**: "Who's enrolled in what" (student to SubjectSection)
- **AttendanceSession**: A single class session with QR
- **AttendanceRecord**: One student's attendance for one session
- **AttendanceAuditLog**: Change history for accountability

## Running Tests

```bash
npm test
```

Runs unit tests for:
- Password hashing and verification
- JWT token generation
- QR generation

To add integration tests, extend `__tests__/` with API route tests.

## Deployment

### Production Checklist

1. **Environment**: Set all env vars in production (never commit `.env`)
2. **Database**: Use a managed PostgreSQL service (Neon, Supabase, RDS)
3. **JWT Secret**: Generate a strong, random secret
4. **HTTPS**: Always use HTTPS in production
5. **Build**: `npm run build`
6. **Start**: `npm run start`

### Example: Deploying to Vercel

```bash
# Connect your repo to Vercel
# Set env vars in Vercel project settings
# Push to main branch to auto-deploy

git push origin main
```

### Example: Deploying to Railway

1. Connect your GitHub repo to Railway
2. Add PostgreSQL addon
3. Set `DATABASE_URL` to Railway's Postgres connection string
4. Deploy from the main branch

## Performance & Scaling

- Database indexes on `(sessionId, studentId)` unique constraint for fast duplicate checks
- Paginated endpoints to prevent large data transfers
- QR tokens are random hex strings (unguessable within the expiry window)
- Session cookies use httpOnly flag to prevent XSS token theft
- Audit logs can be archived/pruned for large datasets

## Security Considerations

1. **Passwords**: Bcrypt hashing with 10 salt rounds
2. **Sessions**: JWT signed with a strong secret, stored in httpOnly cookies
3. **Duplicates**: Enforced by database unique constraint, not just application logic
4. **Ownership**: Every route checks that the user has permission to access the resource
5. **Input**: All API inputs validated with Zod before touching the database
6. **Audit Trail**: All manual attendance changes logged with who, when, and what changed

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running and `DATABASE_URL` is correct.

```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Check connection string format
# postgresql://user:password@host:port/database
```

### "Admin already exists" on register

**Solution**: The first admin can only be registered once. Subsequent accounts must be created through the Admin dashboard via the API.

### QR Code Not Displaying

**Solution**: Ensure `NEXT_PUBLIC_APP_URL` is set correctly and matches your actual domain.

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit with meaningful messages
3. Push and open a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check existing GitHub issues
2. Create a new issue with a clear description and reproduction steps
3. Join the college's tech support channel

---

**Last Updated**: August 2026  
**Version**: 1.0.0
