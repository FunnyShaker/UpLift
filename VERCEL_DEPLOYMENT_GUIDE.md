# Complete Step-by-Step Guide to Deploy on Vercel

## 📋 Prerequisites Checklist
- [ ] GitHub account (with your repo pushed)
- [ ] Vercel account (free tier) - https://vercel.com/signup
- [ ] NocoDB account (free tier) - https://app.nocodb.com
- [ ] All code committed and pushed to GitHub

> **Known issue before you start:** `frontend/src/pages/userProfile.js` still has
> the placeholder strings `YOUR_PROFILE_API_URL`, `YOUR_UPDATE_PROFILE_API_URL`
> and `YOUR_LOGOUT_API_URL`, and it sends cookies (`credentials: "include"`)
> instead of the `Authorization: Bearer <token>` header the API expects.
> Deploying does not fix this - the profile page will load with empty fields and
> "Unable to load your profile information." The `/api/profile` endpoints
> themselves are working. Signup, login and flights are unaffected.

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

### Step 1: Confirm the Backend Is Ready
`backend/vercel.json` and the dependencies in `backend/package.json` are already
committed - there is nothing to create. Just confirm both are pushed:

```bash
git status          # should be clean
git push origin main
```

### Step 2: Deploy Backend to Vercel
1. Go to https://vercel.com/dashboard
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Select your `BTS530-UpLift` repository
5. Click "Import"

### Step 3: Configure Environment Variables
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

### Step 4: Select Root Directory
1. In Vercel, go to **"Settings"** → **"Root Directory"**
2. Click "Edit" and select **"backend"**
3. Click "Save"

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait ~2-5 minutes
3. You should see a green checkmark and a URL like: `https://uplift-backend.vercel.app`
4. **Save this URL!**

### Step 6: Test Backend
Open these in your browser (replace with your URL):
```
https://your-backend-url.vercel.app/api/health     -> {"status":"ok","database":"nocodb"}
https://your-backend-url.vercel.app/api/flights    -> the flight list
```

Check `/api/health` first - it tells you whether the NocoDB variables are right,
which is the usual reason a fresh deploy fails.

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Fix `frontend/.env.production`
This file is committed and currently points at an old Render backend that is no
longer serving the API. Update it to the backend URL from Part 2:

```
REACT_APP_API_URL=https://your-backend-url.vercel.app
```

```bash
git add frontend/.env.production
git commit -m "Point frontend at the Vercel backend"
git push origin main
```

Do **not** create `frontend/.env.local` for this - it is in `.gitignore`, so it
never reaches Vercel and `git add` will refuse it.

`REACT_APP_*` values are baked into the bundle **at build time**, so changing
this file only takes effect on the next build. The variable you set in the
Vercel dashboard (Step 3 below) overrides this file, but keep the file correct
anyway so a local `npm run build` doesn't produce a broken bundle.

### Step 2: Build & Test Locally (Optional)
```bash
cd frontend
npm run build
grep -o "https://[a-z0-9.-]*" build/static/js/main.*.js | sort -u | head
```
The URL you just configured should appear in that list.

### Step 3: Deploy Frontend to Vercel
1. Go to https://vercel.com/dashboard
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Select your `BTS530-UpLift` repository
5. Click "Import"

### Step 4: Configure Settings
1. **Framework Preset**: Select **"Create React App"**
2. **Root Directory**: Select **"frontend"**
3. Click "Environment Variables"
4. Add:
   - Name: `REACT_APP_API_URL`
   - Value: `https://your-backend-url.vercel.app`
5. Click "Save"

### Step 5: Deploy
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

### Test 5: Profile API
The page is not wired up yet (see the note at the top), so test the endpoint
directly. In the browser console on your deployed frontend, after logging in:

```js
fetch(`${process.env.REACT_APP_API_URL || "https://your-backend-url.vercel.app"}/api/profile`, {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
}).then(r => r.json()).then(console.log)
```

You should get `{ fullName, email, userType, country, phone }` ✅
A CORS error here means `FRONTEND_URL` on the backend is wrong (see Part 4).

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

### Profile Page Is Blank

**Error**: "Unable to load your profile information." with empty fields

**Cause**: the placeholder URLs in `frontend/src/pages/userProfile.js` (see the
note at the top of this guide). The request goes to the frontend's own domain,
Vercel answers it with `index.html`, and parsing that as JSON throws.

**Solution**: point the three `fetch` calls at
`${process.env.REACT_APP_API_URL}/api/profile` and `/api/logout`, drop
`credentials: "include"`, and send
`Authorization: Bearer ${localStorage.getItem("token")}` like `viewFlights.js`
does. Then rebuild.

### Frontend Calls the Wrong Backend

**Error**: every API call 404s, or hits an old URL you no longer use

**Cause**: `REACT_APP_API_URL` is baked in at build time. A stale
`frontend/.env.production` or a missing Vercel variable gets compiled into the
bundle and no amount of redeploying the backend changes it.

**Solution**: fix `frontend/.env.production`, confirm `REACT_APP_API_URL` is set
in the frontend project's Vercel variables, then trigger a **new build** (not a
rollback). Verify with:
```bash
grep -o "https://[a-z0-9.-]*" build/static/js/main.*.js | sort -u
```

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
