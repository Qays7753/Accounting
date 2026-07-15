# GitHub Pages Setup — Mockup Deployment

This guide explains how to deploy the interactive HTML mockup (`mockup/index.html`) to GitHub Pages so anyone can preview the app UI in their browser.

---

## 🚀 Quick Setup (2 minutes)

### Step 1: Enable GitHub Pages

1. Go to the repository on GitHub: **https://github.com/Qays7753/Accounting**
2. Click **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **"Source"**, select **"GitHub Actions"**
5. Done! Now any workflow file in `.github/workflows/` can deploy to Pages.

### Step 2: Add the Workflow File

Since the current access token doesn't have `workflow` scope, you need to create the workflow file via the GitHub web UI:

1. Go to: **https://github.com/Qays7753/Accounting/new/main/.github/workflows**
2. Name the file: `deploy-mockup.yml`
3. Copy and paste the content below
4. Click **"Commit new file"**

### Workflow File Content

Copy everything below this line:

```yaml
# Deploy HTML Mockup to GitHub Pages
name: Deploy Mockup to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'mockup/**'
      - '.github/workflows/deploy-mockup.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy-mockup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload mockup artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './mockup'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

      - name: Print deployment URL
        run: |
          echo "✅ Mockup deployed successfully!"
          echo "🔗 URL: ${{ steps.deployment.outputs.page_url }}"
```

### Step 3: Wait for Deployment

1. Go to the **Actions** tab in the repository
2. You'll see a workflow run called "Deploy Mockup to GitHub Pages"
3. Wait ~1 minute for it to complete (green checkmark ✅)
4. The mockup is now live at:

### 🌐 **[https://qays7753.github.io/Accounting/](https://qays7753.github.io/Accounting/)**

---

## 🔄 How It Works

- Every time you push changes to `mockup/index.html`, the workflow automatically re-deploys
- The workflow only triggers when files in `mockup/` or the workflow itself change
- You can also trigger it manually from the Actions tab → "Run workflow"

---

## 📱 What You'll See

The mockup is an interactive HTML replica of the app with:
- ✅ 5 bottom-nav tabs (Home, Finance, Orders, Debts, Settings)
- ✅ Working bottom sheets (tap any button to open)
- ✅ Swipe-to-reveal Edit & Delete on transactions
- ✅ Calendar view with status dots
- ✅ New proposed features: Debt Tracking, Edit Transaction, Theme Picker, Recurring toggle
- ✅ Samsung One UI design (RTL Arabic, soft shadows, Cairo font)

Open it on your phone for the best experience!

---

## ❓ Troubleshooting

### "Pages not deployed" error
- Make sure Step 1 (Source = GitHub Actions) is done
- Check the Actions tab for any error logs

### 404 at the URL
- Wait 2-3 minutes after the first deploy
- Check that the workflow completed successfully (green checkmark)
- Try hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

### Mockup looks unstyled
- Make sure you have an internet connection (Tailwind CSS loads from CDN)
- Check browser console (F12) for any blocked resources

---

## 🔗 Alternative: Direct File Access

If you don't want to set up GitHub Actions, you can also:

1. **Open locally**: Download `mockup/index.html` and open it in any browser
2. **Raw GitHub URL**: Visit `https://raw.githubusercontent.com/Qays7753/Accounting/main/mockup/index.html` (note: Tailwind CDN may not load due to CORS — the GitHub Pages method is recommended)

---

*The workflow file is also stored locally at `.github/workflows/deploy-mockup.yml` but couldn't be pushed automatically because the current token lacks `workflow` scope. Use the web UI method above to add it.*
