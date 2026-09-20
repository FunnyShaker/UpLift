# CORS Error Fix - Step by Step

## ❌ Current Problem
You're getting CORS error on login because the backend and frontend URLs don't match exactly in the CORS configuration.

## ✅ Solution (5 Steps - 5 minutes)

### Step 1: Go to Backend Settings on Vercel
1. Open https://vercel.com/dashboard
2. Click your **Backend project** (up-lift-backend)
3. Click **Settings** tab at top

### Step 2: Fix Environment Variables

**Click "Environment Variables"** and make these changes:

#### ❌ REMOVE this (old session code):
- **SESSION_SECRET** → Delete it!

#### ✏️ EDIT these:

**FRONTEND_URL:**
- Current: `https://up-lift-frontend.vercel.app/` (with slash)
- Change to: `https://up-lift-frontend.vercel.app` (NO slash)
- Click "Save"

**NODE_ENV:**
- Current: `development`
- Change to: `production`
- Click "Save"

**Result should look like:**
```
FRONTEND_URL    = https://up-lift-frontend.vercel.app
NOCODB_URL      = https://app.nocodb.com
NOCODB_TOKEN    = (your NocoDB API token)
JWT_SECRET      = (your secret)
NODE_ENV        = production
PORT            = 3500
```

### Step 3: Trigger Redeploy

1. Click **Deployments** (top tab)
2. Find the latest deployment (top of list)
3. Click the **3 dots** (...) on the right
4. Click **"Redeploy"**
5. Wait 2-3 minutes (watch the progress bar)

### Step 4: Check Vercel Logs

Once redeployed:
1. Click **"Deployments"**
2. Click the latest deployment
3. Click **"Runtime Logs"**
4. You should see: `CORS allowed origins: [ 'https://up-lift-frontend.vercel.app' ]`

### Step 5: Test Login

1. Go to your frontend: https://up-lift-frontend.vercel.app
2. Try logging in
3. **Open browser console** (F12 → Console)
4. Should see **no CORS errors** ✅

---

## 🧪 Debug Checklist

If still not working, check:

- [ ] FRONTEND_URL has NO trailing slash
- [ ] NODE_ENV is "production"
- [ ] Both deployments show "Ready" (green)
- [ ] Backend was redeployed (not just edited)
- [ ] JWT_SECRET is set in backend
- [ ] REACT_APP_API_URL in frontend matches backend URL

---

## 📝 Quick Test Command

In **browser console** on your frontend:

```javascript
// Test 1: Check if backend is reachable
console.log('Testing backend connection...')

fetch('https://up-lift-backend.vercel.app/api/flights')
  .then(r => {
    console.log('Status:', r.status)
    console.log('Headers:', r.headers.get('access-control-allow-origin'))
    return r.json()
  })
  .then(data => console.log('✅ Success!', data))
  .catch(err => console.error('❌ Error:', err.message))

// Test 2: Try login
console.log('Testing login...')

fetch('https://up-lift-backend.vercel.app/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'your-password'
  })
})
  .then(r => r.json())
  .then(data => {
    console.log('Status:', data.message)
    if (data.token) console.log('✅ Token received!')
  })
  .catch(err => console.error('❌ Login error:', err))
```

---

## 💡 Common Mistakes

❌ **FRONTEND_URL with trailing slash** → Remove it!
❌ **NODE_ENV still on development** → Change to production
❌ **Forgot to redeploy** → Must click Redeploy
❌ **SESSION_SECRET still there** → That's old auth, delete it!

---

## 🎯 After Fix

Once working:
- ✅ Login succeeds
- ✅ See user info on home page
- ✅ View flights works
- ✅ Add to cart works
- ✅ Logout works

**You're done!** 🚀
