# Digital Signage Dashboard (KIMS)

A comprehensive, role-based Digital Signage and Duty Roster Management system designed for hospital environments. It allows administrators to effortlessly manage doctor directories, upload daily rosters via Excel, and broadcast live schedules to various digital display screens across hospital branches.

## Key Features

- **Automated Duty Roster Uploads**: Automatically parse and import daily schedules from Excel spreadsheets. Replaces existing rosters seamlessly and validates doctor information automatically.
- **Beautiful Digital Signage Displays**: High-quality UI for patient-facing displays. Features include:
  - Clean, full-width rectangular doctor rows with transparent backgrounds.
  - Boxed consultation timings for clear visibility.
  - Seamlessly looping scrolling marquee footer for 24x7 Ambulance and Emergency helplines.
  - Automatic page rotation for different departments.
  - Real-time date and time headers matching the specific hospital branch (KIMS, KIDS, SSCC, etc.).
- **Doctor Directory Management**: Maintain a central database of clinicians including their names, designations, departments, and profile photos.
- **Role-Based Access Control**: Secure login system with distinct permissions for Super Admins, Branch Admins, and Content Editors, ensuring users only access and modify data for their assigned hospital branches.
- **Media & Playlist Management**: Configure image and video playlists for general signage outside of clinical duty rosters.

## Tech Stack

### Frontend
- **React.js** (Vite)
- **Tailwind CSS** (for styling and animations)
- **Framer Motion** (for smooth page transitions and micro-animations)
- **Lucide React** (for crisp iconography)

### Backend
- **Node.js / Express** (RESTful API architecture)
- **MySQL** (Relational database for storing users, doctors, rosters, and branch configurations)
- **Multer** (for handling image and Excel file uploads)

## Project Structure

- `/frontend` - Contains the React application.
  - `src/features/display` - The patient-facing digital signage screen components.
  - `src/features/doctors` - Management screens for the Roster and Doctor Directory.
- `/backend` - Contains the Node.js API server.
  - `controllers/` - API logic (e.g. `rosterController.js`, `displayController.js`).
  - `routes/` - Express route definitions.

## Getting Started

1. Set up your MySQL database and update the environment variables in `backend/.env`.
2. Start the backend server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Start the frontend development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Access the admin dashboard at `http://localhost:5173/` or view a live display screen at `http://localhost:5173/display/SSCC/KSS`.
