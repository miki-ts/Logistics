"use strict";
const crypto = require("crypto");
const password = process.argv[2];
if (!password || password.length < 14) { console.error("Use a unique password of at least 14 characters."); process.exit(1); }
const salt=crypto.randomBytes(16).toString("hex");
console.log(`scrypt$${salt}$${crypto.scryptSync(password,Buffer.from(salt,"hex"),64).toString("hex")}`);
