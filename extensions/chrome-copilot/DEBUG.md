# Debugging Settings Button Issue

## Steps to Fix Settings Button

### 1. Reload Extension in Chrome
After rebuilding, you need to reload the extension:
1. Go to `chrome://extensions/`
2. Find "GenSX Copilot" extension
3. Click the **reload** button (circular arrow icon)
4. Try clicking Settings button again

### 2. Check Browser Console
If settings button still doesn't work:
1. Right-click the extension icon
2. Select "Inspect popup" 
3. Check the Console tab for any JavaScript errors
4. Look for red error messages when clicking Settings

### 3. Verify Manifest
Check that the built manifest includes options_page:
```bash
cat dist/manifest.json | grep options
```
Should show: `"options_page": "options.html",`

### 4. Check Files Exist
Verify the options files are in the dist folder:
```bash
ls -la dist/options*
```
Should show:
- `options.html`
- `options.js`

### 5. Manual Options Page Access
You can also access settings directly:
1. Go to `chrome://extensions/`
2. Find "GenSX Copilot"
3. Click "Extension options" or "Details" → "Extension options"

## Common Issues

### Missing Permissions
If you see permission errors, the extension needs the "options" permission in manifest.json

### JavaScript Errors
Common errors and fixes:
- `chrome.runtime.openOptionsPage is not a function` → Extension not properly loaded
- `Cannot find module` → Build/import issue
- `Uncaught ReferenceError` → Missing script dependencies

### Extension Not Loading
If the extension doesn't load at all:
1. Check manifest.json syntax (use JSON validator)
2. Ensure all referenced files exist in dist/
3. Check Chrome Developer Tools Console for load errors

## Debug Commands

Test the popup functionality in Chrome DevTools:
```javascript
// In popup inspection console:
chrome.runtime.openOptionsPage();
```

Check if options page loads directly:
```
chrome-extension://[EXTENSION_ID]/options.html
```

## Troubleshooting Results

If none of the above work, the issue might be:
1. Chrome version compatibility 
2. Extension permissions
3. Build process not copying files correctly
4. Popup script not loading properly

Run these diagnostic checks and report back what you find!