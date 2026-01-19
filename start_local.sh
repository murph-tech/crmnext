#!/bin/bash
echo "Starting CRM Next Locally..."

# Function to kill child processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup EXIT INT TERM

# Start Backend
echo "Starting Backend on port 4000..."
cd backend
npm run dev &
cd ..

# Start Frontend
echo "Starting Frontend on port 3000..."
echo "Waiting for backend to warm up..."
sleep 3
npm run dev &

echo "-----------------------------------------------------"
echo "App is running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:4000"
echo "-----------------------------------------------------"
echo "Press Ctrl+C to stop."

wait
