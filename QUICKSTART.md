# Quick Start: Content Management

## 🚀 5-Minute Setup

### 1. Create Supabase Project
```bash
# Go to https://supabase.com
# Create new project
# Run the SQL from supabase-setup.sql in SQL Editor
```

### 2. Get Credentials
```bash
# Supabase Dashboard > Settings > API
# Copy: Project URL and anon public key
```

### 3. Configure App
```javascript
// In browser console after starting app:
app.contentService.setConfig(
  'https://YOUR-PROJECT.supabase.co',
  'YOUR-ANON-KEY'
);
// Restart app
```

### 4. Test
```bash
npm start
# Open any category - you should see "Anygood Picks ⭐"
```

---

## 📝 Adding Content

### Quick: Supabase UI
1. Supabase > Table Editor > curated_picks
2. Insert row with:
   - category: 'read', 'listen', 'watch', 'eat', or 'do'
   - title: Your title
   - description: Short description
   - priority: 1-10 (higher = shows first)
   - is_published: checked

### Better: Notion
See SETUP.md for full Notion integration setup

---

## 🎯 What You Get

**Anygood Picks ⭐**
- Your curated content from Supabase
- Manually managed
- Highest quality

**Fresh Picks 📰**
- Auto-refreshed from RSS feeds
- Updates every hour
- Always new content

---

## 🐛 Debug Commands

```javascript
// Check if Supabase is configured
app.contentService.getStatus()

// Clear cache and force refresh
app.contentService.clearCache()

// Manually fetch curated picks
await app.contentService.getCuratedPicks('read')

// Check what's in collections
console.log(app.collections.read)
```

---

## 💰 Cost: $0/month
- Supabase free tier: 500MB DB + unlimited API calls
- Perfect for 1000s of users

---

## 📚 Full Documentation
See SETUP.md for complete guide
