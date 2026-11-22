
# Payroll Manager

A simple employee payroll management system built using Node.js, Express.js and EJS. It allows users to add, edit, view and delete employee records while automatically calculating tax and net salary.

## Features

- Add new employees
- View all employee records
- Edit employee details
- Delete employee records
- Automatic tax calculation (10%)
- Automatic net salary calculation
- Payroll summary showing total basic salary, tax and net salary
- Form validation for employee details
- JSON file storage

## Technologies Used

- Node.js
- Express.js
- EJS
- HTML
- CSS
- JSON

## Installation and Setup

1. Clone this repository:

   ```bash
   git clone YOUR_GITHUB_REPOSITORY_URL
   ```

2. Open the project folder:

   ```bash
   cd Payroll-Management-App
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Start the application:

   ```bash
   npm start
   ```

5. Open your browser and visit:

   ```text
   http://localhost:3000
   ```

## Project Structure

```text
Payroll Manager/
│
├── modules/
│   ├── fileHandler.js
│   └── payroll.js
│
├── public/
│   └── style.css
│
├── views/
│   ├── add.ejs
│   ├── edit.ejs
│   ├── error.ejs
│   └── index.ejs
│
├── employees.json
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Available Routes

| Method | Route | Description |
|---|---|---|
| GET | `/` | View employees and payroll summary |
| GET | `/add` | Display add employee form |
| POST | `/add` | Add a new employee |
| GET | `/edit/:id` | Display edit employee form |
| POST | `/edit/:id` | Update employee details |
| POST | `/delete/:id` | Delete an employee |

## Payroll Calculation

The application uses a fixed tax rate of 10%.

- Tax = Basic Salary × 10%
- Net Salary = Basic Salary − Tax

All salary values are displayed in Indian Rupees (INR).

## Storage

Employee records are stored locally in `employees.json`. The application reads and updates this file whenever employee information changes.

## Known Limitations

- Uses local JSON file storage instead of a database.
- Does not have user authentication.
- Uses a fixed tax rate of 10%.
- Designed as a basic payroll management application.

## Future Improvements

- Add database integration.
- Implement user authentication.
- Add employee search and filtering.
- Support configurable tax rates.
- Generate payroll reports.
