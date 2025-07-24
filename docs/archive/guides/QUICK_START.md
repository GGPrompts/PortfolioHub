# 🚀 Quick Start Guide

Get your portfolio running in under 5 minutes!

## 1️⃣ First-Time Setup

```bash
# Clone and enter the portfolio
git clone https://github.com/GGPrompts/portfolio-showcase.git
cd portfolio-showcase

# Initialize git (if not cloned from GitHub)
git init
```

## 2️⃣ Add Your First Project

```bash
# Example: Adding your 3D Matrix Cards project
git submodule add https://github.com/GGPrompts/3d-matrix-cards.git projects/3d-matrix-cards
```

## 3️⃣ Update Manifest

Add this to `projects/manifest.json`:

```json
{
  "id": "3d-matrix-cards",
  "title": "3D Matrix Cards",
  "description": "Interactive 3D card effects with matrix rain",
  "path": "projects/3d-matrix-cards/index.html",
  "tags": ["3D", "Animation", "Interactive"],
  "tech": ["HTML", "CSS", "JavaScript"]
}
```

## 4️⃣ Test Locally

Open `index.html` in your browser!

## 5️⃣ Push to GitHub

```bash
git add .
git commit -m "Add 3d-matrix-cards project"
git remote add origin https://github.com/GGPrompts/my-portfolio.git
git push -u origin main
```

## ✅ Done!

Your portfolio is now live. Add more projects by repeating steps 2-3.

---

### 🔄 Updating Projects

When you update a project in its own repo:

```bash
cd portfolio-showcase
./sync-portfolio.sh  # Updates all projects automatically
```

### 📸 Generate Thumbnails

```bash
npm install playwright
node generate-thumbnails.js
```

That's it! Your portfolio stays in sync automatically.