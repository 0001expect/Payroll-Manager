# Payroll Manager

A web-based **Employee and Payroll Management System** built using Node.js, Express.js, MongoDB, Mongoose and EJS.

Payroll Manager provides a centralized platform for managing employee records, processing monthly payroll, tracking salary payments and monitoring important application activities through audit logs.

## Features

### 1. Employee Management
- Add, view, update and delete employee records.
- Automatically generate unique employee codes.
- View individual employee profiles.
- Validate employee information before saving.
- Support legacy employee records.

### 2. Dashboard
- View total employee count.
- View salary and payroll summaries.
- Monitor total basic salary, tax and net salary.
- Access employee and payroll information from one place.

### 3. Employee Search and Filtering
- Search employee records.
- Filter employees by department.
- Sort employee records.
- Paginate employee lists.
- Export employee information to CSV.

### 4. Payroll Management
- Calculate salary using a configurable calculation module.
- Apply a 10% demonstration tax rate.
- Calculate net salary after tax and other deductions.
- Process monthly payroll.
- Prevent duplicate payroll processing for the same employee and month.
- Maintain monthly payroll records.
- Track payroll status, including Processed and Paid.
- View payroll history and monthly summaries.
- Export payroll information to CSV.
- Generate downloadable PDF salary slips.

### 5. Authentication and Role-Based Access
- Secure login and logout functionality.
- Password hashing using bcrypt.
- Session-based authentication.
- MongoDB-backed session storage.
- Role-based authorization for Admin and HR.
- Restricted access to administrative operations.
- Login rate limiting.

### 6. Audit Logs
- Record important employee management activities.
- Track payroll processing activities.
- Record payroll payment-status updates.
- Store the user and role associated with an activity.
- View application activity through an administrative audit log page.

### 7. Validation and Security
- Server-side employee validation.
- Phone number and salary validation.
- Date validation.
- Centralized error handling.
- HTTP security headers using Helmet.
- Environment-based configuration.
- Protected routes and role-based authorization.

## Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend framework |
| MongoDB | Database |
| Mongoose | MongoDB object modeling |
| EJS | Server-side templating |
| HTML5 | Page structure |
| CSS3 | Styling and responsive layouts |
| JavaScript | Application logic |
| bcryptjs | Password hashing |
| express-session | Session management |
| connect-mongo | Session storage |
| Helmet | HTTP security headers |
| express-rate-limit | Login rate limiting |
| dotenv | Environment variables |
| PDFKit | PDF salary slip generation |

## Project Structure

```text
Payroll-Manager/
│
├── config/
│   └── db.js
│
├── middleware/
│   └── auth.js
│
├── models/
│   ├── AuditLog.js
│   ├── Employee.js
│   ├── Payroll.js
│   └── User.js
│
├── modules/
│   └── payroll.js
│
├── public/
│   └── style.css
│
├── routes/
│   ├── auditLogs.js
│   └── payrollReports.js
│
├── scripts/
│   └── createUser.js
│
├── utils/
│   ├── auditLogger.js
│   └── auditMiddleware.js
│
├── views/
│   ├── add.ejs
│   ├── audit-logs.ejs
│   ├── edit.ejs
│   ├── employee-profile.ejs
│   ├── error.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── payroll-history.ejs
│   └── payroll.ejs
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Installation and Setup

### Prerequisites

Install the following before running the application:

- Node.js
- npm
- MongoDB Community Server
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/0001expect/Payroll-Manager.git
```

### 2. Navigate to the Project Directory

```bash
cd Payroll-Manager
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root directory using `.env.example` as a reference.

Configure the required environment variables:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/payroll_manager
SESSION_SECRET=your_secure_random_session_secret
```

Replace the session secret with a strong, randomly generated value.

**Important:** Never upload your `.env` file or expose database credentials and session secrets publicly.

### 5. Start MongoDB

Ensure that your MongoDB service is running.

### 6. Start the Application

```bash
npm start
```

### 7. Open the Application

Visit:

```text
http://localhost:3000
```

Log in using an account provisioned for the application.

## Application Routes

| Method | Route | Description |
|---|---|---|
| GET | `/login` | Display login page |
| POST | `/login` | Authenticate user |
| POST | `/logout` | Log out |
| GET | `/` | Dashboard and employee records |
| GET | `/add` | Employee creation form |
| POST | `/add` | Add employee |
| GET | `/edit/:id` | Employee editing form |
| POST | `/edit/:id` | Update employee |
| POST | `/delete/:id` | Delete employee |
| GET | `/employees/:id` | View employee profile |
| GET | `/export/csv` | Export employee records |
| GET | `/payroll` | View monthly payroll |
| POST | `/payroll/process` | Process monthly payroll |
| GET | `/payroll/history` | View payroll history |
| GET | `/payroll/export` | Export payroll records |
| GET | `/payroll/:id/slip.pdf` | Download salary slip |
| POST | `/payroll/:id/mark-paid` | Update payroll payment status |
| GET | `/audit-logs` | View audit logs |

Access to certain routes depends on the authenticated user's role.

## Payroll Calculation

The current implementation uses a fixed **10% demonstration tax rate**.

**Tax Calculation**

```text
Tax = Basic Salary × 10 / 100
```

**Net Salary Calculation**

```text
Net Salary = Basic Salary - Tax - Other Deductions
```

Example:

| Description | Amount |
|---|---:|
| Basic Salary | ₹50,000 |
| Tax (10%) | ₹5,000 |
| Other Deductions | ₹0 |
| Net Salary | ₹45,000 |

All salary amounts are displayed in Indian Rupees (INR).

**Note:** The tax rate is for demonstration purposes and does not represent an actual statutory tax calculation.

## Database Design

The application uses MongoDB with Mongoose models.

### Employee Collection

Stores employee information such as:

- Employee code
- Name
- Email
- Phone number
- Designation
- Department
- Joining date
- Basic salary

### User Collection

Stores application user information:

- Name
- Email
- Hashed password
- Role

### Payroll Collection

Stores monthly payroll information:

- Employee reference
- Employee code
- Employee name
- Department
- Payroll month
- Basic salary
- Tax rate and tax amount
- Other deductions
- Net salary
- Payroll status
- Processing information

### AuditLog Collection

Stores application activity information:

- User information
- User role
- Action performed
- Module
- Description
- Target record ID
- IP address
- Timestamp

## Security

- Passwords are hashed before storage.
- Authentication protects restricted application routes.
- Role-based authorization controls administrative operations.
- Sessions are stored in MongoDB.
- Login attempts are rate-limited.
- Helmet provides HTTP security headers.
- Environment variables protect sensitive configuration.
- Server-side validation helps prevent invalid data.

## Future Improvements

- Configurable tax slabs and deduction rules.
- Employee attendance management.
- Leave management.
- Email notifications.
- Advanced payroll analytics.
- Cloud deployment.
- Production-grade payment integration.
