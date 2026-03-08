# 🛒 E-Commerce Web App

A full-stack e-commerce platform built with the MERN stack, featuring separate user and admin dashboards, multiple payment methods, and a modern, responsive interface.

## ✨ Features

### 👤 User Features
- 🔐 User authentication (Register/Login)
- 🛍️ Browse products with search and filter options
- 🛒 Shopping cart management
- 💳 Multiple payment methods:
  - **Stripe** integration
  - **Razorpay** integration
  - **Cash on Delivery**
- 📦 Order tracking and history
- 👤 User profile management
- 📱 Fully responsive design

### 🔧 Admin Features
- 📊 Admin dashboard with analytics
- ➕ Add/Edit/Delete products
- 📦 Order management
- 👥 User management
- 🖼️ Image upload with Cloudinary integration
- 📈 Sales tracking

## 🛠️ Tech Stack

### Frontend
- **React** - UI Library
- **React Router DOM** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - HTTP Client
- **React Toastify** - Notifications
- **Vite** - Build Tool

### Backend
- **Node.js** - Runtime Environment
- **Express.js** - Web Framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcrypt** - Password Hashing
- **Cloudinary** - Image Hosting
- **Stripe & Razorpay** - Payment Processing
- **Multer** - File Upload Middleware

## 📁 Project Structure

```
ecommerce-app/
├── frontend/          # User-facing React application
├── admin/            # Admin dashboard React application
├── backend/          # Node.js/Express API server
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Cloudinary account
- Stripe account (for payment)
- Razorpay account (for payment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce-app
   ```

2. **Install dependencies for all three parts**
   
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install

   # Admin
   cd ../admin
   npm install
   ```

3. **Environment Variables Setup**

   Create `.env` files in each directory:

   **Backend (.env)**
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_admin_password
   PORT=4000
   ```

   **Frontend (.env)**
   ```env
   VITE_BACKEND_URL=http://localhost:4000
   ```

   **Admin (.env)**
   ```env
   VITE_BACKEND_URL=http://localhost:4000
   ```

### Running the Application

You need to run **three separate servers** simultaneously:

1. **Backend Server** (Terminal 1)
   ```bash
   cd backend
   npm run server
   ```
   Server runs on: `http://localhost:4000`

2. **Frontend** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```
   Runs on: `http://localhost:5173`

3. **Admin Panel** (Terminal 3)
   ```bash
   cd admin
   npm run dev
   ```
   Runs on: `http://localhost:5174`

## 📦 Deployment on Vercel

### Configure for Vercel Deployment

Each directory (`frontend`, `admin`, and `backend`) contains a `vercel.json` configuration file for deployment.

### Deploy Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   vercel --prod
   ```

3. **Deploy Frontend**
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Deploy Admin**
   ```bash
   cd admin
   vercel --prod
   ```

5. **Update Environment Variables**
   - Go to Vercel Dashboard > Project > Settings > Environment Variables
   - Add all required environment variables for each project
   - Update `VITE_BACKEND_URL` in frontend and admin to point to your deployed backend URL

### Important Notes for Deployment
- Make sure MongoDB Atlas allows connections from anywhere (`0.0.0.0/0`) or add Vercel's IP ranges
- Update CORS settings in backend to allow your frontend and admin domains
- Set all environment variables in Vercel dashboard
- Backend will need serverless function configuration for API routes

## 🔑 API Endpoints

### User Routes
- `POST /api/user/register` - Register new user
- `POST /api/user/login` - User login
- `GET /api/user/profile` - Get user profile

### Product Routes
- `GET /api/product/list` - Get all products
- `POST /api/product/add` - Add new product (Admin)
- `PUT /api/product/update` - Update product (Admin)
- `DELETE /api/product/remove` - Delete product (Admin)

### Cart Routes
- `POST /api/cart/add` - Add to cart
- `GET /api/cart/get` - Get user cart
- `POST /api/cart/update` - Update cart item

### Order Routes
- `POST /api/order/place` - Place order
- `GET /api/order/user` - Get user orders
- `GET /api/order/list` - Get all orders (Admin)
- `PUT /api/order/status` - Update order status (Admin)

## 🔐 Default Admin Credentials

```
Email: admin@forever.com
Password: admin@123
```
*⚠️ Change these in production!*

## 📸 Screenshots

*(Add your application screenshots here)*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Your Name

## 🙏 Acknowledgments

- MongoDB Atlas for database hosting
- Cloudinary for image hosting
- Stripe and Razorpay for payment processing
- Vercel for deployment platform

---

**Built with ❤️ using MERN Stack**


