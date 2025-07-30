# Dare-Omegle: 3-User Video Dare Chat Web App

**Dare-Omegle** is a web application that lets you connect to a random user for video chat with a twist: the "judge" sends a dare, the "performer" does it, and the judge awards points. Features authentication, reporting/rules, live video using Agora, and works well on both desktop and mobile.

---

## 🚀 Features

- **Random Video Pairing:** 1-on-1 video chat with strangers (Omegle style).
- **Dare Challenge Mode:** One user performs, the other dares+scores.
- **Authentication:** Secure register/login with JWTs.
- **User Profiles:** Points, completion/counter stats, rank.
- **Safety:** Rules modal & abuse reporting before challenge start.
- **Real-Time Video & Messaging:** Powered by [Agora.io](https://www.agora.io/).
- **Responsive UI:** Mobile and desktop layouts.
- **No Solo/3-user games:** Only 2-user dare mode for safety and simplicity.

---

## 🧩 Folder Structure

.
├── pages/
│ ├── index.tsx # Main React page (Omegle + Dare challenge UI)
│ └── api/
│ ├── auth/ # Login/Register/Verify endpoints
│ └── rooms/ # Room-management endpoints for video & dare mode
├── libs/
│ └── dbConnect.ts # MongoDB connection helper
├── models/ # Optional: Mongoose models (User, Stats)
├── styles/
│ └── Home.module.css # Styling for the app
├── .env # Environment variable config file (see below)
├── README.md
└── ...

## ⚙️ Setup Instructions

1. **Clone this repository**
2. **Install dependencies**
3. **Set up your `.env` file**

- Get MongoDB Atlas string from the Atlas dashboard (see [Atlas Docs](https://www.mongodb.com/docs/atlas/)).
- Make sure your IP is whitelisted in Atlas!
- Get an Agora account and create an app at [Agora Dashboard](https://console.agora.io/).

4. **Start the server**
The app should now be running on `http://localhost:3000`.

---

## 🗝️ Environment Variables Explained

- `MONGODB_URI` – Atlas string, single `@` after password!
- `JWT_SECRET` – Use a secure, long, random string.
- `NEXT_PUBLIC_AGORA_APP_ID` – From Agora console, public key (frontend-safe).
- `AGORA_SECRET` – For secure token generation on backend.
- (Optionally) Set additional config like email/SMS keys as needed.

---

## 🤳 Features & UX

### Home & Authentication
- Register and login required for all video features.
- JWT-secured authentication.
- User stats and ranks shown after login.

### Modes
- **Random Chat (Omegle):** Connect with strangers 1-on-1, with video and chat. 
- **Dare Challenge:** Only 2 users per "room".
 1. Users agree to safety rules before joining.
 2. When two users connect, *one is randomly picked as Performer, one is Judge*.
 3. The Judge submits a dare (seen by both).
 4. The Performer does the dare on camera and signals completion.
 5. The Judge scores the performance (0–5 stars).
 6. Points are displayed and room can be left.
- **Reporting:** If the rules are violated, reporting action is available. (Custom implementation needed if not already present.)

### Video Streaming
- Agora.io is used for real-time video and audio.
- Video layout is responsive and fills available space.
- Dare Challenge feeds are side-by-side, with performer highlighted.

---

## 📝 Technical Notes

- **Frontend:** React (`pages/index.tsx`), no external state management needed.
- **Backend:** Next.js API routes, MongoDB Atlas with Mongoose.
- **Video:** Agora RTC/RTM SDKs, simple helpers for joining/leaving/publishing tracks.
- **Security:** 
- DB credentials/names NEVER hardcoded, only `.env`.
- JWT secret should be at least 32+ chars for real use.
- Users are authenticated for both modes.
- **Abuse Prevention**
- Rules modal is enforced before Dare mode.
- (You may wish to expand backend reporting endpoints or moderator UI.)

---

## 🛠️ Common Issues

- If you see `MongoParseError`, check your `.env` (`MONGODB_URI`) – you likely have a double `@` sign.
- If you get "Could not connect" errors, whitelist your IP on MongoDB Atlas.
- Agora video issues? Make sure your Agora APP_ID is correct and tokens are being generated properly on the backend.
- Always restart your dev server after changing `.env`.

---

## 🌎 Deployment

- Production builds via `npm run build` and `npm start`.
- Make sure to set secrets and database URIs in your *production* environment.
- Use [Vercel](https://vercel.com), [Render](https://render.com), or [Heroku](https://heroku.com) – but review Agora and database environment needs.

---

## 👮 Safety & Privacy

- Never encourage or reward abusive/harmful dares. Make the rules modal non-skippable.
- Always make it easy to report users.
- Do **not** log video/audio data.
- Use HTTPS in production for privacy.
- Moderate public deployments!

---

## 🙋 FAQ

**Q: Does the app store any videos or photos?**  
A: No. All video is live and peer-to-peer via Agora.

**Q: Can I add more users to Dare mode?**  
A: Change the user count logic in `DareChallengeTwoUsers` to 4 for the 3-user mode.

**Q: What if chat or camera doesn’t work?**  
A: Check that you allowed camera/mic in browser, and that `.env`/Agora config is valid.

---

## 📄 License

MIT (or your chosen license)

---

## 👨‍💻 Authors

- Deepak Vashisth – [deepakvashisth8282@example.com]
- Special thanks to all open-source library authors!


