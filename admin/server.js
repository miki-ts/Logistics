"use strict";

/* Standalone YM Logistics admin server. It intentionally has no dependency on
   the public static site or its files. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = Number(process.env.ADMIN_PORT || 8787);
const SESSION_TTL = 30 * 60 * 1000;
const sessions = new Map();
/* ── Rate limiter: tracks failed login attempts only ──────────────────────── */
const attempts = new Map(); // key → { count, resetAt }
const DATA_FILE = path.join(ROOT, "data", "submissions.json");

function required(name) { if (!process.env[name]) throw new Error(`${name} is required; see .env.example`); return process.env[name]; }
const SECRET = required("ADMIN_SESSION_SECRET");
let PASSWORD_HASH = required("ADMIN_PASSWORD_HASH"); // scrypt$hexSalt$hexHash
let ADMIN_USER = process.env.ADMIN_USERNAME || "admin";

function hmac(value) { return crypto.createHmac("sha256", SECRET).update(value).digest("base64url"); }
function parseCookies(req) { return Object.fromEntries((req.headers.cookie || "").split(";").map(x => x.trim().split("=")).filter(x => x[0]).map(([k,v]) => [k, decodeURIComponent(v || "")])); }
function cookie(name, value, age) { return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`; }
function json(res, status, value) { res.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" }); res.end(JSON.stringify(value)); }
function safeEqual(a,b) { const x=Buffer.from(a), y=Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x,y); }
function verifyPassword(password) {
  const [kind, salt, digest] = PASSWORD_HASH.split("$");
  if (kind !== "scrypt" || !salt || !digest) return false;
  const actual = crypto.scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
  return safeEqual(actual, digest);
}
function session(req) {
  const raw = parseCookies(req).ym_admin; if (!raw) return null;
  const [id, signature] = raw.split("."); if (!id || !signature || !safeEqual(hmac(id), signature)) return null;
  const item = sessions.get(id); if (!item || item.expires < Date.now()) { sessions.delete(id); return null; }
  item.expires = Date.now() + SESSION_TTL; return item;
}
function requireAdmin(req, res) { const s=session(req); if (!s) { json(res,401,{error:"Authentication required"}); return null; } return s; }
function clean(value, limit=160) { return typeof value === "string" && value.length <= limit ? value.trim() : ""; }
function email(value) { const v=clean(value,254); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : ""; }
function submissions() { try { const d=JSON.parse(fs.readFileSync(DATA_FILE,"utf8")); return {quotes:d.quotes||[],messages:d.messages||[],services:d.services||[],teams:d.teams||[],settings:d.settings||{companyName:"YM Logistics",notificationEmail:"",notificationWhatsApp:"",username:ADMIN_USER,passwordHash:PASSWORD_HASH}}; } catch { return {quotes:[],messages:[],services:[],teams:[],settings:{companyName:"YM Logistics",notificationEmail:"",notificationWhatsApp:"",username:ADMIN_USER,passwordHash:PASSWORD_HASH}}; } }
function hashPassword(password){const salt=crypto.randomBytes(16).toString("hex");return `scrypt$${salt}$${crypto.scryptSync(password,Buffer.from(salt,"hex"),64).toString("hex")}`;}
function excel(res,name,rows,headers){const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');const headerRow=headers.map(h=>'<Cell ss:StyleID="header"><Data ss:Type="String">'+esc(h.toUpperCase())+'</Data></Cell>').join('');const dataRows=rows.map(r=>headers.map(h=>'<Cell><Data ss:Type="String">'+esc(r[h])+'</Data></Cell>').join('')).map(cols=>'<Row>'+cols+'</Row>').join('');const xml='<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'+'<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+'<Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1a6b3a" ss:Pattern="Solid"/></Style></Styles>'+'<Worksheet ss:Name="Sheet1"><Table><Row>'+headerRow+'</Row>'+dataRows+'</Table></Worksheet></Workbook>';res.writeHead(200,{"Content-Type":"application/vnd.ms-excel; charset=utf-8","Content-Disposition":'attachment; filename="'+name+'.xls"',"Cache-Control":"no-store"});res.end(xml);}
function save(data) { fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true}); fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2),{mode:0o600}); }
function publicCors(req,res) { const allowed=(process.env.PUBLIC_SITE_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500,null").split(",").map(s=>s.trim()); const origin=req.headers.origin || "null"; if (!allowed.includes(origin) && !allowed.includes("*")) return false; if (origin === "null") { res.setHeader("Access-Control-Allow-Origin","*"); } else { res.setHeader("Access-Control-Allow-Origin",origin); res.setHeader("Vary","Origin"); } return true; }
function readBody(req) { return new Promise((resolve,reject) => { let body=""; req.on("data", c => { body+=c; if(body.length>8*1024*1024) req.destroy(); }); req.on("end",()=>{ try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON")); } }); req.on("error",reject); }); }

/* ── Rate limiter — only failed attempts counted, 20 per 15 min, auto-expire ── */
function rate(req, failed) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  // Clean up expired entries (prevents unbounded Map growth)
  for (const [k, v] of attempts) { if (v.resetAt < now) attempts.delete(k); }
  if (!failed) return true; // successful login: do not count against limit
  const current = attempts.get(key) || { count: 0, resetAt: now + 15 * 60e3 };
  if (current.resetAt < now) { current.count = 0; current.resetAt = now + 15 * 60e3; }
  current.count++;
  attempts.set(key, current);
  return current.count <= 20;
}

function csrf(req,res) { const s=requireAdmin(req,res); return s && req.headers["x-csrf-token"]===s.csrf ? s : null; }

/* ─────────────────────────────────────────────────────────────────────────────
   Notification helpers — email (nodemailer) + WhatsApp (Twilio)
   All failures are logged but never crash the server.
   ───────────────────────────────────────────────────────────────────────────── */

let _mailer = null;
function getMailer() {
  if (_mailer) return _mailer;
  try {
    const nodemailer = require("nodemailer");
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
    _mailer = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT || 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return _mailer;
  } catch (e) {
    console.warn("[Notify] nodemailer not available:", e.message);
    return null;
  }
}

let _twilio = null;
function getTwilio() {
  if (_twilio) return _twilio;
  try {
    const twilio = require("twilio");
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
    _twilio = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    return _twilio;
  } catch (e) {
    console.warn("[Notify] twilio not available:", e.message);
    return null;
  }
}

async function sendNotification(record, type /* "quote" | "message" */) {
  const settings = submissions().settings;
  const toEmail = settings.notificationEmail;
  const toWhatsApp = settings.notificationWhatsApp || process.env.TWILIO_WHATSAPP_TO;
  const companyName = settings.companyName || "YM Logistics";
  const label = type === "quote" ? "Quote Request" : "Contact Message";
  const subject = `[${companyName}] New ${label} from ${record.name}`;
  const body = [
    `New ${label} received on ${new Date().toLocaleString()}`,
    ``,
    `Name:    ${record.name}`,
    `Email:   ${record.email}`,
    `Company: ${record.company || "—"}`,
    `Phone:   ${record.phone || "—"}`,
    type === "quote" ? `Service: ${record.service}` : "",
    ``,
    `Message:`,
    record.message,
  ].filter(l => l !== undefined).join("\n");

  // ── Email ──────────────────────────────────────────────────
  if (toEmail) {
    const mailer = getMailer();
    if (mailer) {
      try {
        await mailer.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: toEmail,
          subject,
          text: body,
        });
        console.log(`[Notify] Email sent to ${toEmail}`);
      } catch (err) {
        console.error("[Notify] Email failed:", err.message);
      }
    } else {
      console.warn("[Notify] Email skipped — SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS in .env)");
    }
  }

  // ── WhatsApp (Twilio) ──────────────────────────────────────
  if (toWhatsApp) {
    const client = getTwilio();
    const fromWA = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
    if (client) {
      try {
        await client.messages.create({
          from: fromWA,
          to: toWhatsApp.startsWith("whatsapp:") ? toWhatsApp : `whatsapp:${toWhatsApp}`,
          body: `${subject}\n\n${body}`,
        });
        console.log(`[Notify] WhatsApp sent to ${toWhatsApp}`);
      } catch (err) {
        console.error("[Notify] WhatsApp failed:", err.message);
      }
    } else {
      console.warn("[Notify] WhatsApp skipped — Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN in .env)");
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Static file server
   ───────────────────────────────────────────────────────────────────────────── */
function serve(req,res) {
  const target = req.url === "/" ? "/public/login.html" : req.url;
  const decoded = decodeURIComponent(target.split("?")[0]);
  // The dashboard document itself is protected server-side, not merely by its JS.
  if (decoded === "/public/dashboard.html" && !session(req)) {
    res.writeHead(302, { Location: "/" }); return res.end();
  }
  if (!decoded.startsWith("/public/") || decoded.includes("..")) { res.writeHead(404); return res.end(); }
  const file=path.join(ROOT,decoded); const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".avif":"image/avif"};
  fs.readFile(file,(err,data)=>{ if(err){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store","Content-Security-Policy":"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});res.end(data); });
}

/* ─────────────────────────────────────────────────────────────────────────────
   HTTP request router
   ───────────────────────────────────────────────────────────────────────────── */
const server=http.createServer(async (req,res)=>{
  try {
    if (req.method === "OPTIONS" && req.url.startsWith("/api/public/")) { if(!publicCors(req,res)) return json(res,403,{error:"Origin not allowed"}); res.writeHead(204,{"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}); return res.end(); }
    if (req.method === "GET" && req.url === "/api/public/services") { if(!publicCors(req,res)) return json(res,403,{error:"Origin not allowed"}); return json(res,200,{services:submissions().services}); }
    if (req.method === "GET" && req.url === "/api/public/team") { if(!publicCors(req,res)) return json(res,403,{error:"Origin not allowed"}); return json(res,200,{teams:submissions().teams}); }

    /* ── Public form submissions + notification trigger ── */
    if (req.method === "POST" && (req.url === "/api/public/quotes" || req.url === "/api/public/messages")) {
      if(!publicCors(req,res)) return json(res,403,{error:"Origin not allowed"});
      const body=await readBody(req), name=clean(body.name), company=clean(body.company), mail=email(body.email), phone=clean(body.phone,40), message=clean(body.message,3000);
      if(!name || !mail || !message) return json(res,422,{error:"Please complete the required fields."});
      const data=submissions(), id=crypto.randomUUID(), record={id,name,company,email:mail,phone,message,createdAt:new Date().toISOString(),status:"Pending"};
      const isQuote = req.url.endsWith("quotes");
      if(isQuote){ const service=clean(body.service,80); if(!service)return json(res,422,{error:"Choose a service."}); record.service=service; data.quotes.unshift(record); } else data.messages.unshift(record);
      save(data);
      // Fire-and-forget notification — never blocks the response
      sendNotification(record, isQuote ? "quote" : "message").catch(()=>{});
      return json(res,201,{ok:true});
    }

    /* ── Login — rate limit only applies to FAILED attempts ── */
    if (req.method === "POST" && req.url === "/api/login") {
      const body=await readBody(req), username=clean(body.username,64), password=clean(body.password,256);
      const stored=submissions().settings;
      ADMIN_USER = stored.username || ADMIN_USER;
      PASSWORD_HASH = stored.passwordHash || PASSWORD_HASH;
      const valid = username && password && safeEqual(username, ADMIN_USER) && verifyPassword(password);
      if (!valid) {
        // Only count failed attempts against rate limit
        if (!rate(req, true)) return json(res,429,{error:"Too many failed attempts. Try again in 15 minutes."});
        return json(res,401,{error:"Invalid username or password"});
      }
      // Successful login — does not consume rate limit allowance
      rate(req, false);
      const id=crypto.randomBytes(32).toString("base64url"), item={user:ADMIN_USER,csrf:crypto.randomBytes(32).toString("base64url"),expires:Date.now()+SESSION_TTL}; sessions.set(id,item);
      res.setHeader("Set-Cookie",cookie("ym_admin",`${id}.${hmac(id)}`,Math.floor(SESSION_TTL/1000))); return json(res,200,{csrf:item.csrf,user:item.user});
    }

    if (req.method === "POST" && req.url === "/api/logout") { const s=requireAdmin(req,res); if(!s)return; if(req.headers["x-csrf-token"]!==s.csrf)return json(res,403,{error:"Invalid request"}); const raw=parseCookies(req).ym_admin.split(".")[0]; sessions.delete(raw);res.setHeader("Set-Cookie",cookie("ym_admin","",0));return json(res,200,{ok:true}); }
    if (req.method === "GET" && req.url === "/api/me") { const s=requireAdmin(req,res); if(!s)return; return json(res,200,{user:s.user,csrf:s.csrf,expiresIn:Math.floor((s.expires-Date.now())/1000)}); }
    if (req.method === "GET" && req.url === "/api/overview") { if(!requireAdmin(req,res))return; const data=submissions(); return json(res,200,{stats:{quotes:data.quotes.length,messages:data.messages.length,customers:new Set(data.quotes.concat(data.messages).map(x=>x.email)).size},quotes:data.quotes.slice(0,10),messages:data.messages.slice(0,10)}); }
    if (req.method === "GET" && req.url === "/api/admin/data") { if(!requireAdmin(req,res))return; const d=submissions(), customers=Object.values([...d.quotes,...d.messages].reduce((a,x)=>{const k=x.email.toLowerCase();a[k]=a[k]||{name:x.name,email:x.email,company:x.company,phone:x.phone,quotes:0,messages:0};a[k].quotes+=d.quotes.includes(x)?1:0;a[k].messages+=d.messages.includes(x)?1:0;return a;},{})); return json(res,200,{quotes:d.quotes,messages:d.messages,customers,services:d.services,teams:d.teams,settings:{companyName:d.settings.companyName,notificationEmail:d.settings.notificationEmail,notificationWhatsApp:d.settings.notificationWhatsApp||"",username:d.settings.username||ADMIN_USER}}); }
    if (req.method === "GET" && req.url === "/api/admin/export/quotes") { if(!requireAdmin(req,res))return; const d=submissions(); return excel(res,"quote-requests",d.quotes,["id","name","company","email","phone","service","message","status","createdAt"]); }
    if (req.method === "GET" && req.url === "/api/admin/export/messages") { if(!requireAdmin(req,res))return; const d=submissions(); return excel(res,"contact-messages",d.messages,["id","name","company","email","phone","message","read","createdAt"]); }
    if (req.method === "POST" && req.url === "/api/admin/team") { if(!csrf(req,res))return; const b=await readBody(req),name=clean(b.name,100),role=clean(b.role,100),image=clean(b.image,500000);if(!name||!role)return json(res,422,{error:"Name and role are required"});const d=submissions();d.teams.push({id:crypto.randomUUID(),name,role,image:image.startsWith("data:image/")?image:""});save(d);return json(res,201,{ok:true}); }
    if (req.method === "POST" && req.url === "/api/admin/credentials") { if(!csrf(req,res))return; const b=await readBody(req),username=clean(b.username,64),password=clean(b.password,256); if(!username||!password||password.length<14)return json(res,422,{error:"Use a username and a password of at least 14 characters"}); const d=submissions(); d.settings.username=username; d.settings.passwordHash=hashPassword(password); ADMIN_USER=username; PASSWORD_HASH=d.settings.passwordHash; save(d); sessions.clear(); return json(res,200,{ok:true}); }
    if (req.method === "PATCH" && req.url.startsWith("/api/admin/team/")) { if(!csrf(req,res))return;const b=await readBody(req),id=req.url.split('/')[4],d=submissions(),x=d.teams.find(v=>v.id===id);if(!x)return json(res,404,{error:"Team member not found"});x.name=clean(b.name,100)||x.name;x.role=clean(b.role,100)||x.role;if(clean(b.image,500000).startsWith('data:image/'))x.image=b.image;save(d);return json(res,200,{ok:true}); }
    /* ── Services PATCH — must come BEFORE the generic admin PATCH ── */
    if (req.method === "PATCH" && req.url.startsWith("/api/admin/services/")) { if(!csrf(req,res))return;const body=await readBody(req),id=req.url.split('/')[4],d=submissions(),x=d.services.find(v=>v.id===id);if(!x)return json(res,404,{error:"Service not found"});x.name=clean(body.name,80)||x.name;x.title=clean(body.title,200)||x.title;x.description=clean(body.description,1000)||x.description;if(clean(body.image,500000))x.image=body.image;save(d);return json(res,200,{ok:true}); }
    /* ── Services POST ── */
    if (req.method === "POST" && req.url === "/api/admin/services") { if(!csrf(req,res))return;const body=await readBody(req),name=clean(body.name,80),title=clean(body.title,200),description=clean(body.description,1000),image=clean(body.image,500000),d=submissions();if(!name)return json(res,422,{error:"Enter a service name"});d.services.push({id:crypto.randomUUID(),name,title,description,image});save(d);return json(res,201,{ok:true}); }
    /* ── Generic admin PATCH (quotes, messages, settings) ── */
    if (req.method === "PATCH" && req.url.startsWith("/api/admin/")) { if(!csrf(req,res))return; const body=await readBody(req), parts=req.url.split("/"), group=parts[3], id=parts[4], d=submissions(); if(group==="quotes"||group==="messages"){const item=d[group].find(x=>x.id===id);if(!item)return json(res,404,{error:"Record not found"}); if(group==="quotes"&&body.status&&["Pending","In Review","Approved","Completed","Cancelled"].includes(body.status))item.status=body.status; if(group==="messages"&&typeof body.read==="boolean")item.read=body.read;save(d);return json(res,200,{ok:true});} if(group==="settings"){d.settings={...d.settings,companyName:clean(body.companyName,100)||d.settings.companyName,notificationEmail:body.notificationEmail?email(body.notificationEmail):"",notificationWhatsApp:clean(body.notificationWhatsApp,30)||""};save(d);return json(res,200,{ok:true});} return json(res,400,{error:"Invalid update"}); }
    if (req.method === "DELETE" && req.url.startsWith("/api/admin/")) { if(!csrf(req,res))return;const [,,,group,id]=req.url.split("/"),d=submissions();if(group==="services"){d.services=d.services.filter(x=>x.id!==id);}else if(group==="quotes"){d.quotes=d.quotes.filter(x=>x.id!==id);}else if(group==="messages"){d.messages=d.messages.filter(x=>x.id!==id);}else if(group==="team"){d.teams=d.teams.filter(x=>x.id!==id);}else return json(res,400,{error:"Invalid delete"});save(d);return json(res,200,{ok:true}); }
    serve(req,res);
  } catch (error) { console.error("Admin error:",error.message); json(res,400,{error:"Request could not be processed"}); }
});
server.listen(PORT,()=>console.log(`YM Admin running at http://localhost:${PORT}`));
