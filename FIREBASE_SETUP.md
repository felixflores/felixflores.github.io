# Firebase Leaderboard Setup - TiltRush

TiltRush now includes a global leaderboard system using Firebase Realtime Database. Follow these steps to set it up:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "tiltrush" or "tiltrush-leaderboard")
4. Follow the setup wizard (you can disable Google Analytics if you want)

## 2. Create a Realtime Database

1. In your Firebase project, go to **Build** → **Realtime Database**
2. Click **Create Database**
3. Choose a location (pick one close to your users)
4. Start in **test mode** for now (we'll secure it later)
5. Click **Enable**

## 3. Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ → **Project Settings**
2. Scroll down to "Your apps"
3. Click the **Web** icon `</>`
4. Register your app with a nickname (e.g., "tiltrush-web")
5. Copy the `firebaseConfig` object

## 4. Update game.html

1. Open `game.html`
2. Find the Firebase configuration section (around line 405)
3. Replace the placeholder values with your config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

## 5. Set Up Security Rules

To prevent spam and abuse, update your database security rules:

1. In Firebase Console, go to **Realtime Database** → **Rules**
2. Replace the rules with:

```json
{
  "rules": {
    "leaderboard": {
      "$level": {
        ".read": true,
        ".write": "auth == null && newData.child('name').val().length == 3 && newData.child('time').isNumber()",
        "$score": {
          ".validate": "newData.hasChildren(['name', 'time', 'timestamp']) && newData.child('name').val().length == 3"
        }
      }
    }
  }
}
```

This allows:
- Anyone to read the leaderboard
- Anyone to write scores with 3-character names
- Validates that scores have required fields

## 6. (Optional) Add Indexes for Performance

For better performance with large leaderboards:

1. Go to **Realtime Database** → **Rules**
2. Add indexes:

```json
{
  "rules": {
    "leaderboard": {
      "$level": {
        ".indexOn": ["time"],
        ".read": true,
        ".write": "auth == null && newData.child('name').val().length == 3 && newData.child('time').isNumber()"
      }
    }
  }
}
```

## 7. Test It!

1. Deploy your site to GitHub Pages
2. Complete a level
3. Enter your name (3 characters, arcade style!)
4. Submit your score
5. View the leaderboard

## Features

- **Arcade-style name entry**: 3 characters, just like classic arcade games
- **Top 50 scores per level**: Only the best times are stored
- **Medal indicators**: 🥇🥈🥉 for top 3
- **Highlighted scores**: Your submitted score flashes in the leaderboard
- **Real-time**: See other players' scores instantly

## Troubleshooting

### "Firebase not initialized"
- Make sure you replaced the config with your actual values
- Check the browser console for errors

### "Permission denied"
- Verify your security rules are set correctly
- Make sure the database is in test mode or has proper write permissions

### Scores not appearing
- Check that the databaseURL includes the full path (with `.firebaseio.com`)
- Verify the database is in the same region as specified in your config

## Cost

Firebase's free tier (Spark plan) includes:
- 100 simultaneous connections
- 1 GB storage
- 10 GB/month data transfer

This is more than enough for a small game. If you get popular, you can upgrade to the pay-as-you-go plan.

## Local Development

The game works without Firebase - it just won't show the global leaderboard. Local personal bests are still tracked in localStorage.
