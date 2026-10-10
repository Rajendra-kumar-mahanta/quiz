# ROBOQUEST — Advanced Real-Time Quiz & Competition Platform

**ROBOQUEST** is a production-oriented, responsive, database-driven live competition and quiz web application engineered specifically for technical workshops, classroom competitions, and engineering conferences.

Initially pre-configured with a **20-Question B.Tech Robotics and Arduino Workshop Challenge**, the system supports unlimited dynamic quizzes, custom scoring rules, speed bonuses, synchronized server countdowns, and projection-ready leaderboards.

---

## 🚀 Key Features

### 1. Central Real-Time Game Engine
- **Server-Authoritative Timing:** Synchronized 30-second timers verified strictly on the backend. Client clock drift or tampering is neutralized.
- **Dynamic Speed Bonus Scoring:** 
  $$\text{Total Score} = \text{Base Marks (10)} + \text{Speed Bonus}$$
  $$\text{Speed Bonus} = \min\left(10, \left\lfloor\frac{\text{Remaining Seconds}}{3}\right\rfloor\right)$$
- **Deterministic Tie-Breaking:** 
  1. Total Score $\downarrow$
  2. Number of Correct Answers $\downarrow$
  3. Total Response Time (ms) $\uparrow$ (Faster is higher)
  4. Joined Timestamp $\uparrow$
- **Zero Duplicate Scoring:** Idempotent submission pipeline prevents multi-vote exploits.
- **Resilient Reconnection:** Participants can refresh browsers or reconnect without losing their progress, score, or submitted answers.

### 2. High-Tech Visual Aesthetic
- **Cyberpunk Color Palette:** Deep Navy Blue (`#050F24`, `#071632`), Dark Blue Surfaces (`#0B2040`), Electric Cyan (`#00D9FF`), Neon Violet (`#8B5CF6`), Bright Blue (`#2997FF`), Emerald Green (`#10B981`), and Amber (`#F59E0B`).
- **Interactive UI Elements:** Glassmorphic card surfaces, SVG circular timer with urgency color-shifting, circuit grid background patterns.
- **Built-in Web Audio Synthesizer:** High-tech synthesized sound effects for countdown ticks, answer locks, victory fanfares, and podium celebrations with instant participant mute/unmute toggles.

### 3. Comprehensive Interfaces
1. **Participant Interface (`/play/[sessionCode]`):** Fast mobile-first layout, circular countdown, code snippet blocks, single / multiple-select / True-False questions, live score updates.
2. **Public Presentation Leaderboard (`/leaderboard/[sessionCode]`):** Fullscreen auditorium projection mode featuring an animated 3D podium for top 3 champions, rank shift indicators, and victory confetti.
3. **Mission Control Dashboard (`/admin/sessions/[id]`):** Real-time monitoring with active participant grid, live submission distribution meters, synchronized question controls, and instant question closure.
4. **Question Bank Master (`/admin/questions`):** Rich filtering by category and difficulty, JSON/CSV bulk importer, drag-and-drop reordering, and live student preview.

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Canvas Confetti.
- **Backend:** Node.js, Next.js API Routes, Socket.IO real-time WebSocket protocol.
- **Database & ORM:** SQLite / PostgreSQL with Prisma ORM.
- **Authentication:** Secure bcrypt password hashing + signed JWT session cookies.
- **QR Code Generation:** Dynamic SVG and PNG client/server rendering.

---

## 📦 Quick Start & Local Execution

### 1. Clone & Install Dependencies
\`\`\`bash
cd /Users/rajendrakumarmahanta/Desktop/Quiz
npm install
\`\`\`

### 2. Configure Environment Variables
Create or verify the `.env` file:
\`\`\`env
DATABASE_URL="file:./dev.db"
JWT_SECRET="roboquest_super_secret_jwt_key_2026_production_grade"
ADMIN_DEFAULT_EMAIL="rajendrakumarmahanta22@gmail.com"
ADMIN_DEFAULT_PASSWORD="admin123"
PORT=3000
\`\`\`

### 3. Initialize & Seed Database
Sync Prisma schema and seed the initial admin account along with the 20-question robotics challenge:
\`\`\`bash
npx prisma db push
node prisma/seed.js
\`\`\`

### 4. Launch Application
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🚀 Production Deployment Guide

### Option A: Standard VPS / Node Server Deployment (PM2 + Nginx)

1. **Clone and Install:**
   ```bash
   git clone <repo-url> /var/www/roboquest
   cd /var/www/roboquest
   npm ci
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env and set your custom JWT_SECRET, PORT, etc.
   ```

3. **Initialize Database & Seed:**
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

4. **Build Production Assets:**
   ```bash
   npm run build
   ```

5. **Start with PM2 Process Manager:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "roboquest-quiz" --env NODE_ENV=production
   pm2 save
   pm2 startup
   ```

6. **Nginx Reverse Proxy & WebSocket Configuration (`/etc/nginx/sites-available/roboquest`):**
   ```nginx
   server {
       listen 80;
       server_name quiz.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Enable SSL via Certbot: `sudo certbot --nginx -d quiz.yourdomain.com`

---

### Option B: Docker Container Deployment

1. **Run with Docker Compose:**
   ```bash
   docker compose up -d --build
   ```

2. **Seed the Database in Docker:**
   ```bash
   docker exec -it roboquest_quiz node prisma/seed.js
   ```

---

## 🔒 Security & Anti-Cheat Summary

- **Server-Side Scoring Engine:** Responses are locked upon receipt; scores and speed bonus multipliers are computed only after question timer closes.
- **Answer Redaction:** Correct answer flags (`isCorrect`) are sanitized from question broadcasts and public API routes until round review.
- **Route Guard Middleware:** All `/admin/*` views and API mutation endpoints are protected with signed JWT HTTP-only cookies.
- **Unique Participant Tokens:** Participants are identified through cryptographically generated UUID tokens, preventing impersonation.
- **Auditorium Isolation:** Public leaderboard screens only receive sanitized telemetry and podium data.

