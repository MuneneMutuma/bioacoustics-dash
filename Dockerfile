# Stage 1: Build the frontend static files
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copy frontend source
COPY frontend/ ./frontend/
# Create backend static directory so Vite can output into it
RUN mkdir -p ./backend/app/static

WORKDIR /build/frontend
RUN npm install
RUN npm run build

# Stage 2: Build the final Python image
FROM python:3.12-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/app/ ./app/

# Overwrite the static directory with the freshly built frontend from Stage 1
COPY --from=frontend-builder /build/backend/app/static/ ./app/static/

# Environment variables
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
