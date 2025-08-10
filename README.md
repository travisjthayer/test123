# File Upload Application

A simple Node.js application for uploading and managing files with PostgreSQL database storage.

## Setup

1. **Database Setup**
   - Ensure PostgreSQL is running on port 5433
   - Create the database table by running the SQL in `schema.sql`:
   ```sql
   psql -h localhost -p 5433 -U postgres -d satrac-files < schema.sql
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - The `.env` file is already configured with your database credentials

4. **Run the Application**
   ```bash
   npm start
   ```
   The server will start on http://localhost:3000

## Features

- Upload files through a web interface
- View all uploaded files in a table
- Download files
- Delete files
- File metadata stored in PostgreSQL database
- Files stored in the `uploads/` directory

## API Endpoints

- `POST /api/upload` - Upload a new file
- `GET /api/files` - Get list of all files
- `GET /api/download/:filename` - Download a specific file
- `DELETE /api/files/:id` - Delete a file

## File Size Limit

Maximum file size: 10 MB