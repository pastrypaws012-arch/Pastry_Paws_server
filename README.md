# 🍰 Pastry Paws - Backend API Server

Express + Node.js backend with **MongoDB Atlas** database integration and **Image API** image storage.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your keys in `.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GOOGLE_DRIVE_CLIENT_EMAIL=your_service_account_email
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
ADMIN_SECRET_KEY=pastrypawsadmin2026
```

### 3. Run Locally
```bash
npm run dev
# Server runs on http://localhost:5000
```

### 4. Seed Initial Menu & Categories
Populate your MongoDB Atlas database with all initial bakery items:
```bash
npm run seed
```

---

## 📡 API Endpoints

- `GET /api/health` - API server status check
- `GET /api/categories` - Fetch all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/items` - Fetch menu items (supports `?category=...`)
- `POST /api/items` - Create new menu item with custom price tiers
- `PUT /api/items/:id` - Update menu item
- `DELETE /api/items/:id` - Delete menu item (auto-cleans Drive file)
- `POST /api/upload` - Upload image directly to Image
- `GET /api/orders` - View recent orders for admin dashboard
- `POST /api/orders` - Submit customer order
- `PATCH /api/orders/:id/status` - Update order status (pending, baking, delivered)

---

## 🌐 Deploy to Render

1. Create a new GitHub repository for this backend (e.g. `Pastry_Paws_Backend`).
2. Push this folder to your repository:
   ```bash
   git init
   git add .
   git commit -m "feat: initial backend commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/Pastry_Paws_Backend.git
   git push -u origin main
   ```
3. In Render, click **New + > Web Service** and select your backend repository.
4. Render automatically detects the `render.yaml` configuration!
