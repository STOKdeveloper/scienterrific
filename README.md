# SCIENTERRIFIC

An interactive scientific visualization platform built with React, Three.js, and Framer Motion. Explore complex physical phenomena through immersive 3D simulations and mathematical laboratories.

## 🚀 Features

### Space & Astronomy
- **The Solar System**: Real-time 3D orbital simulation of our planetary system.
- **Earth: Day & Night**: Visualization of Earth's rotation and light/shadow dynamics.

### Physics & Mechanics
- **Gravity & Singularity**: Theoretical model of gravitational singularities and event horizons.
- **Three Body Problem**: Real-time analysis of chaotic orbital dynamics and three-body gravitational interactions.
- **Doppler Effect**: Acoustic and electromagnetic wave compression and relativistic observer analysis.

### Mathematics
- **Chaos Theory**: Mandelbrot set and fractal exploration with interactive box-selection zoom.
- **Primes (Discrete Number Theory & Geometry Lab)**:
  - Interactive Cartesian coordinate plane with continuous domains up to **$\pm 1,000\text{M}$ ($1,000,000,000$ / $1\text{ Billion}$)** across all four quadrants.
  - $1$ explicitly assumed prime across all mathematical modes and calculations.
  - **8 Specialized Plotting Architectures**:
    - **Axis Cross**: Prime distribution along $|x|=1$ and $|y|=1$.
    - **Prime Lattice ($P \times P$)**: 2D discrete grid of pure prime intersections.
    - **Gaussian Primes ($\mathbb{Z}[i]$)**: Complex plane visualization with 4-fold radial symmetry and norm analysis $N(z) = x^2 + y^2$.
    - **Fibonacci vs. Primes**: Dual styles including continuous golden trajectory curves ($p_n, F_n$) and discrete lattice intersections with golden ratio guidelines.
    - **Golden Spiral (Phyllotaxis)**: Sunflower seed packing polar coordinates ($r = \sqrt{p_n}, \theta = n \times 137.5^\circ$) revealing natural spiral arms.
    - **Collatz ($3n+1$) Hailstone Dynamics**: Primes plotted against total stopping times.
    - **Euler's Totient $\phi(x)$ Envelope**: Upper diagonal boundary $y = x - 1$ showcasing primes as the bounding ceiling for totients.
    - **Pythagorean Prime Rays ($a^2 + b^2 = p^2$)**: Primitive Pythagorean triples with prime hypotenuse rendered with concentric orbital circles.
  - **Display Configurations**: Independent toggles for **Prime Gridlines** and **Twin Primes ($p+2$)** bridge arcs.
  - **Live Point Inspector**: Real-time hover HUD with primality testing, Fibonacci indexing, Gaussian classification, Collatz steps, and Euler totient values.
  - **Visual Feedback**: Asynchronous calculation and render pipeline with animated loading spinners on option icons during point calculation.

### Earth & Nature
- **Plate Tectonics**: Lithospheric interaction analysis of divergent, convergent, and transform boundaries.
- **Volcanic Activity**: 3D simulation of magma buildup and interactive eruptions.
- **The Water Cycle**: Detailed hydrologic flow analysis from evaporation to precipitation and collection.

### Compute
- **Game of Life**: Conway's cellular automaton projected onto sphere, cube, and flat cross-net geometries with seamless edge-wrapping topology.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **3D Engine**: Three.js, @react-three/fiber, @react-three/drei
- **Animations**: Framer Motion, Lucide Icons
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **Deployment**: Docker, Nginx

## 💻 Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```
2. **Start dev server:**
   ```bash
   pnpm run dev
   ```
3. **Build for production:**
   ```bash
   pnpm run build
   ```

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

## 🗺️ Roadmap
- Quantum tunneling visualization
- Fluid dynamics simulation
- General Relativity spacetime curvature model

## 📋 Changelog

### v1.10.0
- **Primes (Discrete Number Theory Lab - Mathematics Section)**:
  - Added full Cartesian graph with $x$ and $y$ axes extending from negative to positive up to $\pm 1,000\text{M}$ ($1\text{ Billion}$).
  - Assumes $1$ is prime throughout all computations and visual representations.
  - 8 distinct plotting architectures: Axis Cross, Prime Lattice, Gaussian Primes ($\mathbb{Z}[i]$), Fibonacci vs. Primes (Trajectory & Lattice), Golden Spiral (Phyllotaxis), Collatz $3n+1$ Trajectory, Euler Totient $\phi(x)$ Envelope, and Pythagorean Prime Rays.
  - Overlay configurations: Prime Gridlines and Twin Primes ($p+2$) arcs.
  - Interactive point inspector HUD, logarithmic scale slider with presets, and zoom/pan controls.
  - Animated loading spinner on option icons and HUD headers during point calculation and plotting.
- **Sidebar UX & Layout Refinements**:
  - Hidden scrollbars with smooth mouse-wheel, trackpad, and touch scrolling across all browsers.
  - Tightened vertical spacing between category labels and page link items for a more compact and polished layout.

### v1.9.0
- **Game of Life**: Added 3D Conway's Game of Life visualization
  - 6-face cube-native simulation engine with topologically correct edge neighbours
  - Three geometry projections: Sphere (cubified sphere), Cube (flat-faced), and Flat (cross-net unfold)
  - Playback controls: play/pause, step forward/back, randomize
  - Configurable grid density, seed sparsity, and simulation speed
  - Depth-based Z-shading for visual occlusion
  - Toggle empty cell visibility with backside culling
  - Spacebar shortcut for play/pause

---
*Created by [Your Name/Stokdeveloper]*
