# SCIENTERRIFIC

An interactive scientific visualization platform built with React, Three.js, and Framer Motion. Explore complex physical phenomena through immersive 3D simulations.

## 🚀 Features

- **The Solar System**: Real-time 3D orbital simulation of our planetary system.
- **Earth: Day & Night**: Visualization of Earth's rotation and light/shadow dynamics.
- **Singularity**: Theoretical model of gravitational singularities.
- **Three Body Problem**: Analysis of chaotic orbital dynamics.
- **Chaos Theory**: Mandelbrot set exploration with box-selection zoom.
- **Doppler Effect**: Acoustic compression and wave analysis.
- **Plate Tectonics**: Lithospheric interaction analysis of divergent, convergent, and transform boundaries.
- **Volcanic Activity**: 3D simulation of magma buildup and interactive eruptions.
- **The Water Cycle**: Detailed hydrologic flow analysis from evaporation to collection.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **3D Engine**: Three.js, @react-three/fiber, @react-three/drei
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS
- **Deployment**: Docker, Nginx

## 🐳 Docker Deployment

The project is fully containerized for easy deployment.

### Local Run (Docker Compose)

1. **Build and start:**
   ```bash
   docker-compose up -d --build
   ```
2. **Access:**
   Navigate to `http://localhost:8080`.

### Pull from GitHub Container Registry (GHCR)

```bash
docker pull ghcr.io/stokdeveloper/scienterrific:latest
docker run -d -p 8080:80 --name scienterrific ghcr.io/stokdeveloper/scienterrific:latest
```

### Manual Docker Build (Local)

## 💻 Development

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start dev server:**
   ```bash
   npm run dev
   ```
3. **Build for production:**
   ```bash
   npm run build
   ```

## 🗺️ Roadmap
- Quantum tunneling visualization
- Fluid dynamics simulation
- General Relativity spacetime curvature model

---
*Created by [Your Name/Stokdeveloper]*
