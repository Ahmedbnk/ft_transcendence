const DB_KEY = 'devhub_v4';
const SESSION_KEY = 'devhub_session';

function freshDb() {
  return {
    nextId: 100,
    users: [
      { id: 1, name: 'Karim Senior', email: 'senior@dev.io', pw: 'demo1234', role: 'senior', xp: 0, linkedin: 'linkedin.com/in/karim-senior', seniorReq: null },
      { id: 2, name: 'Sara Junior', email: 'junior@dev.io', pw: 'demo1234', role: 'junior', xp: 0, linkedin: '', seniorReq: null },
      { id: 3, name: 'Omar K.', email: 'omar@dev.io', pw: 'demo1234', role: 'junior', xp: 0, linkedin: 'linkedin.com/in/omar-k', seniorReq: { status: 'pending', linkedin: 'linkedin.com/in/omar-k', ago: '1D AGO' } },
      { id: 4, name: 'Admin', email: 'admin@dev.io', pw: 'demo1234', role: 'admin', xp: 0, linkedin: '', seniorReq: null },
    ],
    projects: [],
    subs: [],
    seniorReviews: [],
    notifs: [],
  };
}

function loadDb() {
  try {
    const d = JSON.parse(localStorage.getItem(DB_KEY));
    if (d && d.users) return d;
  } catch (e) {}
  return freshDb();
}

const db = loadDb();
function save() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
save();

export function resetDemo() {
  localStorage.removeItem(DB_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

const delay = (ms = 80) => new Promise(r => setTimeout(r, ms));

/* ---------- auth-service ---------- */

export async function login(email, password) {
  await delay();
  const u = db.users.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.pw === password);
  if (!u) throw new Error('Wrong credentials. Try senior@dev.io or junior@dev.io / demo1234');
  sessionStorage.setItem(SESSION_KEY, String(u.id));
  return publicUser(u);
}

export async function register(name, email, password) {
  await delay();
  const e = email.trim().toLowerCase();
  if (!name || !e || password.length < 8) throw new Error('All fields required · password ≥ 8 chars');
  if (db.users.some(x => x.email.toLowerCase() === e)) throw new Error('Email already registered');
  const u = { id: db.nextId++, name, email: e, pw: password, role: 'junior', xp: 0, linkedin: '', seniorReq: null };
  db.users.push(u);
  sessionStorage.setItem(SESSION_KEY, String(u.id));
  save();
  return publicUser(u);
}

export function logout() { sessionStorage.removeItem(SESSION_KEY); }

export function me() {
  const v = sessionStorage.getItem(SESSION_KEY);
  if (!v) return null;
  return db.users.find(u => u.id === parseInt(v, 10)) || null;
}

export async function updateMe({ name, linkedin, password }) {
  const u = me(); if (!u) throw new Error('Not signed in');
  if (name) u.name = name;
  if (linkedin !== undefined) u.linkedin = linkedin;
  if (password) u.pw = password;
  save();
  return publicUser(u);
}

export async function requestSenior(linkedin) {
  const u = me(); if (!u) throw new Error('Not signed in');
  if (!linkedin) throw new Error('LinkedIn is required to request senior promotion');
  if (u.seniorReq && u.seniorReq.status === 'pending') throw new Error('Request already pending');
  u.linkedin = linkedin;
  u.seniorReq = { status: 'pending', linkedin, ago: 'JUST NOW' };
  db.users.filter(x => x.role === 'admin').forEach(a =>
    db.notifs.push({ id: db.nextId++, user: a.id, txt: `${u.name} requested senior promotion`, kind: 'acc', ago: 'NOW' }));
  save();
}

function publicUser(u) {
  const { pw, ...rest } = u;
  return rest;
}

/* ---------- users / leaderboard ---------- */

export function userById(id) { return db.users.find(u => u.id === id); }
export function userName(id) { const u = userById(id); return u ? u.name : '—'; }

export function seniorRatingSummary(seniorId) {
  const r = db.seniorReviews.filter(x => x.senior === seniorId);
  if (!r.length) return { avg: 0, count: 0 };
  return { avg: r.reduce((a, x) => a + x.stars, 0) / r.length, count: r.length };
}

export function leaderboardJuniors() {
  return db.users.filter(u => u.role === 'junior').map(u => {
    const subs = db.subs.filter(s => s.junior === u.id);
    return { user: u, xp: u.xp || 0, subCount: subs.length, approvedCount: subs.filter(s => s.status === 'approved').length };
  }).sort((a, b) => b.xp - a.xp);
}

export function leaderboardSeniors() {
  return db.users.filter(u => u.role === 'senior').map(u => ({
    user: u,
    xp: u.xp || 0,
    validated: db.projects.filter(p => p.senior === u.id)
      .reduce((a, p) => a + db.subs.filter(s => s.project === p.id && s.status === 'approved').length, 0),
    rating: seniorRatingSummary(u.id),
  })).sort((a, b) => b.xp - a.xp);
}

export function pendingSeniorRequests() { return db.users.filter(u => u.seniorReq && u.seniorReq.status === 'pending'); }

export async function decideSeniorRequest(userId, approve) {
  const x = userById(userId); if (!x || !x.seniorReq) return;
  x.seniorReq.status = approve ? 'approved' : 'rejected';
  if (approve) x.role = 'senior';
  notify(userId, approve ? 'Your senior request was APPROVED — welcome to the seniors side 🎉' : 'Your senior request was rejected', approve ? 'ok' : 'bad');

  save();
}

export async function forceSenior(userId) {
  const x = userById(userId); if (!x) return;
  x.role = 'senior';
  notify(userId, 'An admin promoted you to senior directly', 'ok');
  save();
}

/* ---------- project-service ---------- */

export async function createProject({ title, description, slots, discordInvite, pdf }) {
  const u = me();
  if (!u || u.role !== 'senior') throw new Error('Seniors only');
  if (!title || !description || !slots || slots < 1 || !pdf) throw new Error('Title, description, slots (≥1) and a PDF of the requirements are all required.');
  if (pdf.type !== 'application/pdf') throw new Error('The requirements file must be a PDF.');
  const data = await readAsDataUrl(pdf);
  const n = db.projects.length + 1;
  const p = {
    id: 'P-' + (n < 10 ? '0' : '') + n,
    senior: u.id, title, desc: description, slots, discord: discordInvite || 'discord.gg/yourserver',
    pdf: { name: pdf.name, data },   // later: replace with pdfUrl pointing to MinIO
  };
  db.projects.push(p); save();
  return p;
}

function readAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function listProjects() { return db.projects; }
export function projectById(id) { return db.projects.find(p => p.id === id); }
export function myProjects() { const u = me(); return u ? db.projects.filter(p => p.senior === u.id) : []; }
export function subsOf(projectId) { return db.subs.filter(s => s.project === projectId); }

/* ---------- submission-service ---------- */

export function mySubs() { const u = me(); return u ? db.subs.filter(s => s.junior === u.id) : []; }

export async function subscribe(projectId) {
  const u = me(), p = projectById(projectId);
  if (!u || !p) throw new Error('Not found');
  if (subsOf(projectId).length >= p.slots) throw new Error('Project is full');
  const s = { id: db.nextId++, project: projectId, junior: u.id, repo: '', status: 'working', feedback: '', ago: 'JUST NOW', rated: false };
  db.subs.push(s);
  notify(p.senior, `u.namesubscribedto"{u.name} subscribed to "u.namesubscribedto"{p.title}"`, 'acc');
  save();
  return s;
}

export async function submitRepo(subId, repoUrl) {
  const s = db.subs.find(x => x.id === subId);
  if (!s) throw new Error('Not found');
  if (!/^https?:\/\/.+\..+/.test(repoUrl.trim())) throw new Error('Enter a valid repo URL (https://…)');
  s.repo = repoUrl.trim(); s.status = 'submitted'; s.ago = 'JUST NOW';
  const p = projectById(s.project);
  notify(p.senior, `me().namesubmittedarepofor"{me().name} submitted a repo for "me().namesubmittedarepofor"{p.title}"`, 'acc');
  save();
}

export async function resubmit(subId) {
  const s = db.subs.find(x => x.id === subId);
  s.status = 'submitted'; s.ago = 'JUST NOW';
  const p = projectById(s.project);
  notify(p.senior, `me().namere−submitted"{me().name} re-submitted "me().namere−submitted"{p.title}"`, 'acc');
  save();
}

const XP_JUNIOR_APPROVED = 50, XP_SENIOR_VALIDATED = 30;

export async function sendReview(subId, verdict, feedback) {
  const s = db.subs.find(x => x.id === subId);
  s.status = verdict; s.feedback = feedback; s.ago = 'JUST NOW'; s.rated = false;
  const p = projectById(s.project);
  if (verdict === 'approved') {
    const j = userById(s.junior), sr = userById(p.senior);
    if (j) j.xp = (j.xp || 0) + XP_JUNIOR_APPROVED;
    if (sr) sr.xp = (sr.xp || 0) + XP_SENIOR_VALIDATED;
  }
  notify(s.junior,
    `Your submission for "p.title"was{p.title}" wasp.title"was{verdict === 'approved' ? 'APPROVED 🎉 (+' + XP_JUNIOR_APPROVED + ' xp)' : 'sent back with feedback'}`);
  save();
  return { approved: verdict === 'approved' };
}

/* ---------- review-service ---------- */

export async function submitRating(subId, stars, comment) {
  const s = db.subs.find(x => x.id === subId); if (!s) return;
  const p = projectById(s.project);
  db.seniorReviews.push({ id: db.nextId++, senior: p.senior, junior: s.junior, project: p.id, sub: s.id, stars, comment, ago: 'JUST NOW' });
  s.rated = true;
  notify(p.senior, `me().nameratedyourreviewon"{me().name} rated your review on "me().nameratedyourreviewon"{p.title}" ${stars}★`, 'acc');
  save();
}

export function reviewsForSenior(seniorId) {
  return db.seniorReviews.filter(r => r.senior === seniorId).slice().reverse();
}

/* ---------- notification-service ---------- */

export function myNotifs() {
  const u = me();
  return u ? db.notifs.filter(n => n.user === u.id).slice().reverse() : [];
}

export function notify(userId, txt, kind = 'acc') {
  db.notifs.push({ id: db.nextId++, user: userId, txt, kind, ago: 'NOW' });
}

export function clearNotifs() {
  const u = me(); if (!u) return;
  db.notifs = db.notifs.filter(n => n.user !== u.id);
  save();
}

/* ---------- admin ---------- */

export function adminStats() {
  return {
    users: db.users.length,
    projects: db.projects.length,
    subs: db.subs.length,
    pendingSeniorReqs: pendingSeniorRequests().length,
  };
}
