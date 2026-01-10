# Anygood Content Management Setup

This guide will help you set up the Supabase-powered content management system for Anygood.

## Overview

Anygood now features a two-tier content system:

1. **Anygood Picks ⭐** - Your manually curated content (managed via Supabase/Notion)
2. **Fresh Picks 📰** - Auto-refreshed RSS feeds (updated hourly)

## Quick Start (5 minutes)

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to your users, probably EU-West for London)
3. Wait for the project to be created (~2 minutes)

### Step 2: Run the SQL Setup

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase-setup.sql`
4. Click **Run** or press `Cmd+Enter`
5. You should see "Anygood Supabase setup completed successfully!"

### Step 3: Get Your API Credentials

1. In Supabase dashboard, go to **Settings > API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

### Step 4: Configure the App

**Option A: Via Browser Console (Quick Test)**
```javascript
// Open the app in dev mode and paste this in the browser console:
app.contentService.setConfig(
  'https://your-project.supabase.co',
  'your-anon-key-here'
);
// Then restart the app
```

**Option B: Via localStorage (Persistent)**
```javascript
// In browser console:
localStorage.setItem('supabase_config', JSON.stringify({
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key-here'
}));
// Then restart the app
```

**Option C: Via Environment Variables (Production)**
- For production builds, add to your environment:
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5: Test It!

1. Run your app: `npm start`
2. Open any category (Read, Listen, Watch, etc.)
3. You should see:
   - **Anygood Picks ⭐** with sample curated content
   - **Fresh Picks 📰** with RSS content (may take a few seconds to load)

---

## Adding Your Own Curated Content

### Method 1: Directly in Supabase (Easiest)

1. Go to Supabase Dashboard > **Table Editor**
2. Click on **curated_picks** table
3. Click **Insert** > **Insert row**
4. Fill in:
   - `category`: read, listen, watch, eat, or do
   - `title`: The main title
   - `description`: A short description
   - `link`: URL (optional)
   - `author`: Author/creator name (optional)
   - `priority`: 1-10 (higher shows first)
   - `is_published`: ✓ (checked)
5. Click **Save**
6. Refresh your app to see the new item!

### Method 2: Via Notion (Recommended for Regular Updates)

If you want a nice interface for managing content, use Notion:

#### Setup Notion Integration

1. **Create a Notion Database** with these columns:
   - `Title` (Text)
   - `Category` (Select: Read, Listen, Watch, Eat, Do)
   - `Description` (Text)
   - `Link` (URL)
   - `Image` or `Image URL` (URL)
   - `Author` (Text)
   - `Curator Note` (Text) - Your personal note
   - `Tags` (Multi-select) - Optional
   - `Priority` (Number) - 1-10
   - `Published` (Checkbox)

2. **Create Notion Integration**:
   - Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Click **New integration**
   - Name it "Anygood Sync"
   - Select your workspace
   - Copy the **Internal Integration Token**

3. **Connect Database to Integration**:
   - Open your Notion database
   - Click `•••` (three dots) > **Add connections**
   - Find and select "Anygood Sync"

4. **Get Database ID**:
   - Open your Notion database
   - Copy the URL. It looks like:
     `https://notion.so/xxxxx?v=yyyyy`
   - The `xxxxx` part is your Database ID

5. **Configure the Sync Script**:
   - Copy `env.example` to `.env`:
     ```bash
     cp env.example .env
     ```
   - Edit `.env` and fill in your credentials:
     ```
     NOTION_API_KEY=secret_abc123...
     NOTION_DATABASE_ID=abc123...
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_SERVICE_KEY=your-service-key
     ```
   - **Important**: Use the **service_role** key (from Supabase Settings > API), not the anon key

6. **Install Dependencies**:
   ```bash
   npm install @notionhq/client @supabase/supabase-js dotenv
   ```

7. **Run the Sync**:
   ```bash
   node notion-sync.js
   ```

#### Automate Sync with GitHub Actions

Create `.github/workflows/notion-sync.yml`:

```yaml
name: Sync Notion to Supabase

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install @notionhq/client @supabase/supabase-js dotenv
      
      - name: Run sync
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: node notion-sync.js
```

Add your credentials to GitHub Secrets:
- Go to GitHub repo > Settings > Secrets and variables > Actions
- Add each secret

---

## Managing RSS Sources

You can also manage RSS sources via Supabase instead of hardcoding them:

1. Go to Supabase > **Table Editor** > **rss_sources**
2. Edit, add, or remove sources
3. Set `is_active` to false to temporarily disable a source
4. Change `priority` to control which sources are fetched first

---

## How It Works

### Content Refresh Strategy

1. **On app startup**: Loads curated picks from Supabase (cached for 1 hour)
2. **When opening a category**: 
   - Fetches your curated picks from Supabase
   - Refreshes RSS feeds (if older than 1 hour)
   - Shows 10 curated + 15 RSS items
3. **Caching**: Content is cached locally to avoid excessive API calls

### Collection Structure

Each default category (Read, Listen, Watch, Eat, Do) now has:

```
📚 Read
├── ⭐ Anygood Picks (Your curated content from Supabase)
│   └── Max 10 items, sorted by priority
├── 📰 Fresh Picks (Auto-refreshed from RSS)
│   └── Max 15 items, shuffled for variety
└── My List (User's personal items)
```

---

## Troubleshooting

### "Supabase not configured"
- Run `app.contentService.getStatus()` in console to check status
- Make sure you've set the config via `setConfig()` or localStorage

### No curated picks showing
- Check Supabase table has `is_published = true`
- Check category name matches exactly: 'read', 'listen', 'watch', 'eat', or 'do'
- Clear cache: `app.contentService.clearCache()`

### RSS feeds not loading
- Check browser console for errors
- RSS feeds may be slow or blocked by CORS
- Try manually refreshing: Click the ↻ button on Fresh Picks

### Notion sync errors
- Verify integration has access to your database
- Check column names match exactly (case-sensitive)
- Ensure at least one item has `Published` checked

---

## Cost Estimates

### Free Tier (Perfect for Starting)
- Supabase: 500MB database, unlimited API requests
- Notion: Free for personal use
- GitHub Actions: 2000 minutes/month
- **Total: $0/month**

### At Scale (1,000-10,000 users)
- Supabase: Still likely FREE (just serving content, no heavy compute)
- Notion: Still FREE
- **Total: $0-5/month**

---

## Next Steps

1. ✅ Set up Supabase and run the SQL
2. ✅ Configure API credentials
3. ✅ Test with sample data
4. ⭐ Add your own curated picks
5. 📝 (Optional) Set up Notion for easier content management
6. 🔄 (Optional) Automate with GitHub Actions

---

## Support

If you run into issues:
1. Check browser console for errors
2. Run `app.contentService.getStatus()` to debug
3. Verify your Supabase credentials are correct
4. Check that sample data loaded correctly in Supabase

Happy curating! 🎉
