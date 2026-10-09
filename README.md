[README-Nexus.md](https://github.com/user-attachments/files/33250646/README-Nexus.md)
# Nexus Social Network

A lightweight social network built from scratch to practice Fullstack development.

> Repo: https://github.com/Bendyonish/Nexus-Social-Network

### Features
- User pages: Main feed, Profile, Auth
- File uploads (`/uploads` folder)
- Client-side routing without page reload (`js/router.js`)
- Responsive layout (`public` + CSS)
- Basic auth logic (`js/auth.js`)

### Tech Stack
- **Backend:** Node.js, Express (`server.js`)
- **Frontend:** HTML5, CSS3 (Flex/Grid), Vanilla JavaScript (ES6+)
- **Tools:** Git, npm

### Project Structure
```
nexus-social-network/
├── data/            # data storage
├── public/          # frontend static
├── uploads/         # user uploads
├── server.js        # main server
├── package.json
└── .gitignore
```

### How to run locally
```bash
git clone https://github.com/Bendyonish/Nexus-Social-Network.git
cd Nexus-Social-Network
npm install
node server.js
```
Open http://localhost:3000

### What I learned
- Building Express server from scratch
- Structuring JS app (router, auth, utils)
- Working with file system and uploads
- Adaptive CSS

### Next steps / TODO
- [ ] JWT auth + password hashing
- [ ] Database (PostgreSQL / SQLite) instead of file storage
- [ ] Like / Comment system
- [ ] Python API version

---
Author: Vyacheslav Subbotin — Junior Python / Fullstack Developer
Looking for freelance tasks: landing pages, JS fixes, Python scripts.
