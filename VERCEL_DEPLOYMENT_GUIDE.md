# Complete Step-by-Step Guide to Deploy on Vercel

## 📋 Prerequisites Checklist
- [ ] GitHub account (with your repo pushed)
- [ ] Vercel account (free tier) - https://vercel.com/signup
- [ ] NocoDB account (free tier) - https://app.nocodb.com
- [ ] All code committed and pushed to GitHub

---

## Part 1: Setup NocoDB (Database)

The UpLift base holds three tables: **Users**, **Flights** and **Search Details**.

### Step 1: Get an API Token
1. Go to https://app.nocodb.com and open the UpLift base
2. Click your avatar (top right) → **"Account Settings"** → **"Tokens"**
3. Click **"Add New Token"**, give it a name, and copy the token
4. Save it - you'll need it as `NOCODB_TOKEN`

### Step 2: Get the Table IDs
For each of the three tables:
1. Right-click the table in the left sidebar
2. Click **"Copy Table ID"** (it looks like `mabc123xyz456`)
3. Save them as `NOCODB_TABLE_USERS`, `NOCODB_TABLE_FLIGHTS`, `NOCODB_TABLE_SEARCHES`

### Step 3: (Optional) Get the Search Details Link Field ID
Only needed if searches should be linked back to the user who ran them:
1. Open the **Search Details** table → **"..."** menu → **"API Snippet"**
2. Find the "Link Records" example and copy the link field id from the URL
3. Save it as `NOCODB_SEARCHES_USER_LINK_ID`

### Step 4: Verify Locally
```bash
cd backend
cp .env.example .env    # then fill in the values above
npm run check-db
```
Every configured table should report **OK**.

---

## Part 2: Deploy Backend to Vercel

### Step 1: Create vercel.json in Backend
In `/backend` folder, create a file named `vercel.json`:

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

### Step 2: Update Backend package.json
Make sure your `backend/package.json` has these dependencies:
```json
"dependencies": {
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.1.0"
}
```

### Step 3: Commit Changes
```bash
cd backend
git add vercel.json package.json
git commit -m "Add Vercel configuration"
git push origin main
```

### Step 4: Deploy Backend to Vercel
1. Go to https://vercel.com/dashboard
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Select your `BTS530-UpLift` repository
5. Click "Import"

### Step 5: Configure Environment Variables
1. In Vercel project settings, find **"Environment Variables"**
2. Add these variables:

| Name | Value |
|------|-------|
| `NOCODB_URL` | `https://app.nocodb.com` |
| `NOCODB_TOKEN` | Your NocoDB API token from Part 1 |
| `NOCODB_TABLE_USERS` | Table id of the Users table |
| `NOCODB_TABLE_FLIGHTS` | Table id of the Flights table |
| `NOCODB_TABLE_SEARCHES` | Table id of the Search Details table |
| `NOCODB_SEARCHES_USER_LINK_ID` | (Optional) link field id from Part 1, Step 3 |
| `JWT_SECRET` | Generate one: `openssl rand -hex 32` (run in terminal) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | (Leave blank for now, update after frontend deploys) |

3. Click "Save"

### Step 6: Select Root Directory
1. In Vercel, go to **"Settings"** → **"Root Directory"**
2. Click "Edit" and select **"backend"**
3. Click "Save"

### Step 7: Deploy
1. Click **"Deploy"**
2. Wait ~2-5 minutes
3. You should see a green checkmark and a URL like: `https://uplift-backend.vercel.app`
4. **Save this URL!**

### Step 8: Test Backend
Open this in your browser (replace with your URL):
```
https://your-backend-url.vercel.app/api/flights
```

You should see flights data! ✅

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Update Frontend .env
In `/frontend`, create `.env.local`:

```
REACT_APP_API_URL=https://your-backend-url.vercel.app
```

Example:
```
REACT_APP_API_URL=https://uplift-backend.vercel.app
```

### Step 2: Build & Test Locally (Optional)
```bash
cd frontend
npm run build
```

### Step 3: Commit Changes
```bash
cd frontend
git add .env.local
git commit -m "Add frontend environment configuration"
git push origin main
```

### Step 4: Deploy Frontend to Vercel
1. Go to https://vercel.com/dashboard
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Select your `BTS530-UpLift` repository
5. Click "Import"

### Step 5: Configure Settings
1. **Framework Preset**: Select **"Create React App"**
2. **Root Directory**: Select **"frontend"**
3. Click "Environment Variables"
4. Add:
   - Name: `REACT_APP_API_URL`
   - Value: `https://your-backend-url.vercel.app`
5. Click "Save"

### Step 6: Deploy
1. Click **"Deploy"**
2. Wait ~3-5 minutes
3. You should see your frontend URL: `https://uplift-frontend.vercel.app`

---

## Part 4: Connect Frontend & Backend (Final Step!)

### Update Backend Environment Variable
1. Go to **Backend Project** on Vercel
2. Go to **Settings** → **Environment Variables**
3. Find `FRONTEND_URL` and update it with your **Frontend URL**:
   ```
   https://uplift-frontend.vercel.app
   ```
4. Click "Save"
5. Go to **Deployments** and click **"Redeploy"** on the latest deployment

---

## Part 5: Test Everything!

### Test 1: Signup
1. Go to your frontend: `https://uplift-frontend.vercel.app`
2. Click "Create Account"
3. Fill in:
   - Name: John Doe
   - Email: john@example.com
   - Password: Test123
   - Type: Individual
4. Click "Sign Up"
5. You should see the home page with your name! ✅

### Test 2: View Flights
1. Click "View Available Flights"
2. You should see flight cards ✅

### Test 3: Logout
1. Click "Logout"
2. You should be redirected to login page ✅

### Test 4: Login Again
1. Use same email and password from signup
2. You should see your info on home page ✅

---

## 🎉 Deployment Complete!

Your URLs:
- **Frontend**: `https://uplift-frontend.vercel.app`
- **Backend**: `https://uplift-backend.vercel.app`

---

## 🐛 Troubleshooting

### Backend Not Connecting
**Error**: "Failed to load flights"

**Solution**:
1. Check `NOCODB_URL`, `NOCODB_TOKEN` and the `NOCODB_TABLE_*` ids in backend environment variables
2. Open `https://your-backend-url.vercel.app/api/health` - it reports the database status
3. Check `FRONTEND_URL` is set in backend

### User Info Not Showing
**Error**: "User data not available"

**Solution**:
1. Check JWT_SECRET is set in backend
2. Logout and login again
3. Check browser console for errors (F12)

### CORS Errors
**Error**: "Access to XMLHttpRequest blocked by CORS"

**Solution**:
1. Check `FRONTEND_URL` is correctly set in backend
2. Redeploy backend after changing environment variables
3. Make sure `REACT_APP_API_URL` in frontend matches backend URL exactly

### Login Not Working
**Error**: "Invalid credentials"

**Solution**:
1. Make sure you created an account first
2. Check email and password are correct
3. Check the NocoDB connection is working (`/api/health`)
4. Check backend logs in Vercel

---

## 📚 Useful Vercel Commands

```bash
# Login to Vercel CLI
vercel login

# Deploy from terminal
vercel --prod

# View deployment logs
vercel logs

# Pull environment variables
vercel env pull .env.local
```

---

## 🔐 Security Notes

- ✅ JWT_SECRET should be strong and unique
- ✅ Never commit `.env` files to GitHub
- ✅ Generate new JWT_SECRET for production
- ✅ Use different credentials for dev vs production
- ✅ Enable 2FA on Vercel account

---

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- NocoDB API: https://docs.nocodb.com/data-sources/data-apis
- Express.js: https://expressjs.com
- React: https://react.dev

Your project is now **live on the internet!** 🚀
