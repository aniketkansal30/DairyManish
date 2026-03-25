# 🥛 Manish Dairy — Backend Setup Guide

## Project Structure

```
manish-dairy/
├── backend/               ← Yeh folder
│   ├── server.js          ← Main server
│   ├── package.json
│   ├── .env               ← Banao (example se copy karo)
│   ├── models/
│   │   ├── Product.js     ← MongoDB schema
│   │   ├── Bill.js
│   │   └── Customer.js
│   └── routes/
│       ├── products.js    ← /api/products
│       ├── bills.js       ← /api/bills
│       └── customers.js   ← /api/customers
└── frontend/
    └── src/
        └── App.js         ← App_updated.js se replace karo
```

---

## ⚡ Backend Chalu Karne Ke Steps

### Step 1 — Dependencies install karo
```bash
cd backend
npm install
```

### Step 2 — .env file banao
```bash
cp .env.example .env
```
`.env` file mein apna MongoDB URI daalo.

### Step 3 — MongoDB Options

**Option A: Local MongoDB (PC pe install ho)**
```
MONGODB_URI=mongodb://localhost:27017/manish_dairy
```

**Option B: MongoDB Atlas (Free Cloud — Recommended)**
1. https://cloud.mongodb.com pe jaao
2. Free cluster banao
3. Connection string copy karo:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/manish_dairy
```

### Step 4 — Backend start karo
```bash
# Development mode (auto-restart with nodemon)
npm run dev

# Production mode
npm start
```

Server chalega: `http://localhost:5000`

---

## ⚡ Frontend Update Karne Ke Steps

### Step 1 — .env file banao (React project mein)
```bash
# frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 2 — App.js update karo
`App_updated.js` mein jo code hai usse apne `App.js` mein merge karo:

1. **`useLocalStorage` hook DELETE karo** (line 36-48)
2. **`App()` function REPLACE karo** with the one in App_updated.js
3. **`ProductsView()` function REPLACE karo** with the one in App_updated.js
4. **Baaki sab (BillingView, SalesView, etc.) same rahega** — kuch mat badlo

---

## 📡 API Endpoints

| Method | Endpoint | Kaam |
|--------|----------|------|
| GET    | /api/products | Saare products |
| POST   | /api/products | Naya product |
| PUT    | /api/products/:id | Product update |
| DELETE | /api/products/:id | Product delete |
| GET    | /api/bills | Saare bills |
| GET    | /api/bills?date=2025-03-25 | Ek din ke bills |
| GET    | /api/bills?month=2025-03 | Ek mahine ke bills |
| POST   | /api/bills | Naya bill save |
| GET    | /api/bills/analytics | Analytics data |
| GET    | /api/customers | Saare customers |
| GET    | /api/customers/:phone | Ek customer detail |
| GET    | /api/health | Server status check |

---

## 🔧 Troubleshooting

**"Server se connect nahi ho paya"**
→ Backend chal raha hai? `npm run dev` karo
→ Port 5000 block toh nahi? `.env` mein PORT badlo

**"MongoDB connection error"**
→ `.env` mein MONGODB_URI sahi hai?
→ Atlas use kar rahe ho toh IP whitelist karo (0.0.0.0/0)

**CORS Error browser mein**
→ `.env` mein FRONTEND_URL sahi set karo (default: http://localhost:3000)
