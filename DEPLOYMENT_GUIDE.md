# Deploying to Vercel - JWT Auth Setup Guide

## ✅ What We Changed

### Backend Changes
1. **Replaced session-based auth with JWT** - Now stateless and Vercel-compatible
2. **Created JWT middleware** (`middleware/auth.js`) - Verifies tokens on protected routes
3. **Updated auth routes** - Login/Signup now return JWT tokens
4. **Removed session setup** - No longer storing state on server
5. **Protected `/api/home` endpoint** - Uses JWT verification middleware

### Frontend Changes
1. **Updated login page** - Stores JWT token in localStorage after login
2. **Updated signup page** - Stores JWT token in localStorage after signup
3. **Updated home page** - Sends JWT token in Authorization header
4. **Improved logout** - Clears token from localStorage

## 🚀 How to Deploy

### Option 1: Deploy Backend to Vercel

#### Step 1: Create vercel.json in backend folder
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

#### Step 2: Update .env for Vercel
Add these environment variables in Vercel dashboard:
- `NOCODB_URL` - Your NocoDB instance URL (e.g. `https://app.nocodb.com`)
- `NOCODB_TOKEN` - NocoDB API token
- `NOCODB_TABLE_USERS`, `NOCODB_TABLE_FLIGHTS`, `NOCODB_TABLE_SEARCHES` - table ids
- `JWT_SECRET` - A strong secret key (generate one: `openssl rand -hex 32`)
- `NODE_ENV` - Set to "production"
- `FRONTEND_URL` - Your frontend URL (e.g., `https://myapp.vercel.app`)

#### Step 3: Push to GitHub and connect to Vercel
```bash
git add .
git commit -m "Convert to JWT authentication for Vercel deployment"
git push origin main
```

Then link your repo to Vercel.

### Option 2: Deploy Frontend to Vercel

#### Step 1: Update .env in frontend
```
REACT_APP_API_URL=https://your-backend.vercel.app
```

#### Step 2: Deploy
Push to GitHub and link to Vercel. Vercel auto-detects React and builds it.

## 📝 .env Variables Needed

### Backend (.env)
```
NOCODB_URL=https://app.nocodb.com
NOCODB_TOKEN=your-nocodb-api-token
NOCODB_TABLE_USERS=table-id
NOCODB_TABLE_FLIGHTS=table-id
NOCODB_TABLE_SEARCHES=table-id
JWT_SECRET=your-generated-secret-here
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
PORT=3000
```

### Frontend (.env.local)
```
REACT_APP_API_URL=https://your-backend.vercel.app
```

## 🔑 Generate JWT Secret
Run in terminal:
```bash
openssl rand -hex 32
```
Copy the output and use it as JWT_SECRET.

## ✨ Why JWT Works on Vercel

- **Stateless**: Token is stored on client, not server
- **No database calls needed for auth**: Just verify the signature
- **Scales infinitely**: Multiple instances don't share state
- **Serverless-friendly**: Each function is independent
- **Industry standard**: Used by major platforms

## 🧪 Testing Before Deployment

```bash
# Test backend locally
cd backend
npm start

# In another terminal, test login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Should return a token in response
# Copy that token and test home endpoint:
curl http://localhost:3000/api/home \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Should return user data
```

## ⚠️ Important Notes

1. Always use a strong `JWT_SECRET` - Never use the default
2. Keep secrets in environment variables, NEVER commit them
3. Set `JWT_SECRET` differently for dev and production
4. Tokens expire in 7 days (configurable in auth.js)
5. Make sure the NocoDB API token is valid and set in Vercel

## 🎉 You're Ready for Production!

Your app is now:
- ✅ Stateless (Vercel-compatible)
- ✅ Serverless-friendly
- ✅ Scalable
- ✅ Using modern JWT authentication
