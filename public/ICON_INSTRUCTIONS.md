# Icon Creation Instructions

To replace the Firebase logo with your own favicon, you need to create the following files:

## Required Files:

### 1. `src/app/favicon.ico` (Replace existing)
- **Size**: 32x32 pixels (minimum), 64x64 pixels (recommended)
- **Format**: .ico
- **Purpose**: Main favicon for browser tabs

### 2. `public/icon.png`
- **Size**: 32x32 pixels
- **Format**: PNG
- **Purpose**: Fallback icon for modern browsers

### 3. `public/apple-touch-icon.png`
- **Size**: 180x180 pixels
- **Format**: PNG
- **Purpose**: Icon for iOS devices when added to home screen

## How to Create These Files:

### Option 1: Online Favicon Generators
1. Go to https://favicon.io/ or https://realfavicongenerator.net/
2. Upload your logo/image
3. Download the generated files
4. Place them in the correct locations

### Option 2: Manual Creation
1. Create your logo in a design tool (Photoshop, Figma, Canva, etc.)
2. Export as PNG at the required sizes
3. Convert to .ico format for favicon.ico (use online converters)

### Option 3: Simple Text/Emoji Favicon
If you want a simple text-based favicon:
1. Create a simple SVG with your brand name or logo
2. Convert to PNG at the required sizes
3. Convert to .ico for favicon.ico

## File Structure After Creation:
```
src/app/
├── favicon.ico          # Main favicon (32x32 or 64x64)

public/
├── icon.png             # 32x32 PNG icon
└── apple-touch-icon.png # 180x180 PNG for iOS
```

## Testing:
After creating the files:
1. Restart your development server
2. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
3. Check the browser tab - you should see your new favicon

## Note:
The layout.tsx file has been updated to explicitly reference these icon files, which should override any default Firebase favicon. 