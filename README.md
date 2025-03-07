# eMed Onboarding POC

A proof-of-concept application for eMed's chronic care management platform onboarding process.

## Overview

This application provides:
- Company portal provisioning
- Enrollment code management
- Employee enrollment and tracking
- Integration with lab, telehealth, and pharmacy services

## Architecture

- **Frontend**: React with React Router
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (hosted on Supabase)

## Setup Instructions

### Prerequisites
- Node.js v14+ (v18 recommended)
- npm or yarn
- PostgreSQL database (or Supabase account)

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file with required environment variables:

DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_random_jwt_secret
PORT=5000
NODE_ENV=development

4. Start the server: `npm run dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env` file:

REACT_APP_API_URL=http://localhost:5000/api


4. Start the development server: `npm start`

### Database Setup
1. Run the SQL schema in your PostgreSQL database or Supabase SQL Editor
2. The backend includes a seed endpoint for populating test data

## Usage

### Test Credentials
- Email: admin@acme.com
- Password: password123

### Seeding the Database
Click the "Seed Database" button on the login page to populate the database with test data.


