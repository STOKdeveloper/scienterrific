# Docker Deployment Instructions

This project is configured to run in a Docker container, making it easy to deploy on a local machine or on a NAS like TrueNAS SCALE.

## Prerequisites
- Docker installed on your machine.
- (Optional) Docker Compose installed.

## Local Machine
To run the application locally using Docker Compose:

1. **Build and start the container:**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the application:**
   Open your browser and navigate to `http://localhost:8080`.

## TrueNAS SCALE
To run this on TrueNAS SCALE, you have a few options:

### Option 1: Using the "Launch Docker Image" feature
1. Build the image on your local machine and push it to a registry (like Docker Hub, GitHub Packages, or a local registry).
   ```bash
   docker build -t yourusername/scienterrific:latest .
   docker push yourusername/scienterrific:latest
   ```
2. In TrueNAS SCALE, go to **Apps** -> **Discover Apps** -> **Custom App** (or **Launch Docker Image**).
3. Set the **Image Name** to `yourusername/scienterrific`.
4. Set **Port Forwarding**:
   - Container Port: `80`
   - Host Port: `8080` (or any available port).
5. (Optional) Set up Environment Variables if you add any later.

### Option 2: Using a Docker Compose App (if available in your version)
Some versions of TrueNAS SCALE or 3rd party catalogs (like TrueCharts) allow importing a `docker-compose.yml`. You can use the provided file directly.

## Configuration
- **Port:** The container listens on port `80`.
- **Root Directory:** The application files are served from `/usr/share/nginx/html`.
- **Nginx Config:** SPA routing is handled by a custom `nginx.conf` included in the image.
