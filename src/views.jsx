import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './store';
import * as api from './api';
import { Pill, SubPill, Stars, RatingBadge, XpBar, ReqsBadge,
         ProjectModal, ReviewModal, RateModal, SeniorRequestModal, SubDetailModal, Confetti } from './ui';

const { userById, userName } = api;


/* ---------- shared card ---------- */

function SubCard({ s, isSenior }) {
  const { openModal, refresh, toast } = useApp();
  const p = api.projectById(s.project);
  if (!p) return null;
  return (
    <div className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => openModal(<SubDetailModal subId={s.id} />)}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <b>{p.title}</b>
        <SubPill status={s.status} />
        <span className="mono" style={{ color: 'var(--mut)' }}>{s.ago}</span>
        <div style={{ flex: 1 }} />
        <span className="act">View details →</span>
        {!isSenior && s.status === 'working' &&
          <button className="btn acc sm" onClick={e => { e.stopPropagation(); openModal(<SubDetailModal subId={s.id} />); }}>Submit for review →</button>}
        {isSenior && s.status === 'submitted' &&
          <button className="btn ok sm" onClick={e => { e.stopPropagation(); openModal(<ReviewModal subId={s.id} />); }}>Review submission →</button>}
        {isSenior && s.repo &&
          <span className="act mono" onClick={e => { e.stopPropagation(); toast(`Repo: ${s.repo}`); }}>repo ↗</span>}
      </div>
      {s.feedback && (
        <div className="card" style={{ marginTop: 12, borderLeft: '3px solid var(--acc)', fontSize: 13.5 }}>
          <b style={{ fontSize: 11, letterSpacing: '.07em', color: 'var(--mut)' }}>SENIOR FEEDBACK</b><br />{s.feedback}
        </div>
      )}
      {s.status === 'changes' && !isSenior &&
        <button className="btn sm" style={{ marginTop: 12 }} onClick={async e => {
          e.stopPropagation();
          await api.resubmit(s.id); toast('Re-submitted for review'); refresh();
        }}>Re-submit after changes</button>}
      {!isSenior && (s.status === 'approved' || s.status === 'changes') && !s.rated &&
        <button className="btn gh sm" style={{ marginTop: 12 }} onClick={e => {
          e.stopPropagation(); openModal(<RateModal subId={s.id} />);
        }}>★ Rate this review</button>}
    </div>
  );
}

function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([label, value, color]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <b style={color ? { color } : undefined}>{value}</b>
        </div>
      ))}
    </div>
  );
}

/* ---------- auth ---------- */

export function Landing() {
  const { user, go } = useApp();
  const projects = api.listProjects();
  const juniors = api.leaderboardJuniors().length;
  const waiting = api.mySubs().length && 0 || 0; // public stat: count all submitted
  const allWaiting = (() => {
    let n = 0; api.listProjects().forEach(p => api.subsOf(p.id).forEach(s => { if (s.status === 'submitted') n++; })); return n;
  })();
  return (
    <>
      <div className="hero">
        <div className="blob" />
        <Pill kind="blue">LEARN BY BUILDING · v2.0</Pill>
        <h1 style={{ marginTop: 22 }} className="rise">Real projects.<br />Real <em>review</em>. Real growth.</h1>
        <p className="rise" style={{ animationDelay: '.1s' }}>Seniors post real projects with clear requirements. Juniors subscribe, build in their own GitHub repo, and get a full code review when they ship. Free work for seniors, real experience for juniors.</p>
        <div className="rise" style={{ animationDelay: '.2s' }}>
          {user
            ? <button className="btn acc" style={{ padding: '13px 26px' }} onClick={() => go('dash')}>Open dashboard →</button>
            : <>
              <button className="btn acc" style={{ padding: '13px 26px' }} onClick={() => go('register')}>Join now →</button>{' '}
              <button className="btn gh" style={{ padding: '13px 26px' }} onClick={() => go('login')}>Sign in</button>
            </>}
        </div>
        <div className="tick rise" style={{ animationDelay: '.3s' }}>
          <span><span className="dot">●</span> <b>{projects.length}</b> projects</span>
          <span><span className="dot">●</span> <b>{juniors}</b> juniors building</span>
          <span><span className="dot">●</span> <b>{allWaiting}</b> waiting review</span>
        </div>
      </div>
      <div className="feat">
        <div><span className="n">01</span><b>Senior posts a project</b><p>Requirements, stack, max juniors, and a Discord channel for questions and the final review.</p></div>
        <div><span className="n">02</span><b>Junior builds it</b><p>Subscribe, create your own GitHub repo, ask questions on Discord, then submit your repo link.</p></div>
        <div><span className="n">03</span><b>Review &amp; verdict</b><p>The senior reviews the code: approved, or changes requested with real feedback. Learning by doing.</p></div>
      </div>
    </>
  );
}

export function Login() {
  const { go, refresh, toast } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = async () => {
    try {
      const u = await api.login(email, pw);
      refresh(); toast(`Signed in as u.name({u.name} (u.name({u.role})`);
      go(u.role === 'admin' ? 'admin' : 'dash');
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <div className="authbox">
      <h1 style={{ fontSize: 25, margin: '34px 0 4px' }}>Sign in</h1>
      <p className="lead">Welcome back.</p>
      <label>Email</label><input placeholder="senior@dev.io" value={email} onChange={e => setEmail(e.target.value)} />
      <label>Password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
      {err && <div className="card" style={{ borderLeft: '3px solid var(--bad)', padding: '12px 16px', marginTop: 14, fontSize: 13.5 }}>{err}</div>}
      <button className="btn" style={{ width: '100%', marginTop: 22 }} onClick={submit}>Sign in →</button>
      <p className="lead" style={{ textAlign: 'center', marginTop: 18, fontSize: 13.5 }}>
        No account? <span className="act" onClick={() => go('register')}>Create one</span>
      </p>
      <div className="card" style={{ marginTop: 26, background: 'var(--soft)', border: 'none', fontSize: 12.5, lineHeight: 2 }}>
        <b className="mono" style={{ fontSize: 10.5, letterSpacing: '.07em' }}>DEMO ACCOUNTS · PASSWORD: demo1234</b><br />
        senior@dev.io — post projects, review juniors<br />
        junior@dev.io — subscribe, build, submit<br />
        admin@dev.io — approve senior requests
      </div>
    </div>
  );
}

export function Register() {
  const { go, refresh, toast } = useApp();
  const [n, setN] = useState(''), [e, setE] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('');
  const submit = async () => {
    try {
      const u = await api.register(n, e, p);
      refresh(); toast(`Welcome, ${u.name}`); go('dash');
    } catch (ex) { setErr(ex.message); }
  };
  return (
    <div className="authbox">
      <h1 style={{ fontSize: 25, margin: '34px 0 4px' }}>Create account</h1>
      <p className="lead">Start building today.</p>
      <label>Name</label><input placeholder="Your name" value={n} onChange={ev => setN(ev.target.value)} />
      <label>Email</label><input placeholder="you@example.com" value={e} onChange={ev => setE(ev.target.value)} />
      <label>Password (min 8 characters)</label>
      <input type="password" value={p} onChange={ev => setP(ev.target.value)}
        onKeyDown={ev => { if (ev.key === 'Enter') submit(); }} />
      {err && <div className="card" style={{ borderLeft: '3px solid var(--bad)', padding: '12px 16px', marginTop: 14, fontSize: 13.5 }}>{err}</div>}
      <button className="btn" style={{ width: '100%', marginTop: 22 }} onClick={submit}>Create account →</button>
      <p className="lead" style={{ textAlign: 'center', marginTop: 18, fontSize: 13.5 }}>
        Already have one? <span className="act" onClick={() => go('login')}>Sign in</span>
      </p>
    </div>
  );
}

/* ---------- shell wrapper ---------- */

function Shell({ children }) {
  const { user } = useApp();
  if (!user) return <div className="main" style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div>;
  return <div className="split"><Side /><div className="main">{children}</div></div>;
}

function Side() {
  const { user, route, go, logout } = useApp();
  const links = user.role === 'admin'
    ? [['admin', '⚑ Admin panel'], ['projects', '▤ All projects'], ['leaderboard', '↑ Leaderboard']]
    : user.role === 'senior'
      ? [['dash', '◧ Desk'], ['projects', '▤ All projects'], ['myprojects', '✦ My projects'], ['leaderboard', '↑ Leaderboard']]
      : [['dash', '⌂ Dashboard'], ['projects', '▤ Browse projects'], ['mysubs', '≡ My work'], ['leaderboard', '↑ Leaderboard']];
  links.push(['profile', '◎ Profile']);
  return (
    <div className="side">
      {links.map(([r, label]) => (
        <a key={r} className={route === r ? 'on' : ''} onClick={() => go(r)}>{label}</a>
      ))}
      <div className="grow" />
      <a onClick={logout} style={{ color: 'var(--bad)' }}>⏻ Sign out</a>
    </div>
  );
}

/* ---------- dashboards ---------- */

export function Dash() {
  const { user, go, openModal } = useApp();
  if (!user) return <Login />;
  if (user.role === 'senior') {
    const mine = api.myProjects();
    const mineIds = mine.map(p => p.id);
    const allSubs = mine.flatMap(p => api.subsOf(p.id));
    const waiting = allSubs.filter(s => s.status === 'submitted');
    const approved = allSubs.filter(s => s.status === 'approved');
    return (
      <Shell>
        <h1>Senior desk</h1>
        <p className="lead">Your projects, your juniors, your free dev time.</p>
        <Stats items={[
          ['MY PROJECTS', mine.length],
          ['SUBSCRIBED JUNIORS', allSubs.length],
          ['AWAITING REVIEW', waiting.length, waiting.length ? 'var(--warn)' : undefined],
          ['APPROVED', approved.length, 'var(--ok)'],
        ]} />
        {waiting.length > 0 && <>
          <h2>Submissions to review</h2>
          {waiting.map(s => <SubCard key={s.id} s={s} isSenior />)}
        </>}
        <h2>Quick action</h2>
        <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b>Post a new project</b>
            <div className="mono" style={{ color: 'var(--mut)' }}>SET REQUIREMENTS · SLOTS · DISCORD CHANNEL</div>
          </div>
          <button className="btn acc sm" onClick={() => go('newproject')}>+ New project</button>
        </div>
      </Shell>
    );
  }
  // junior
  const mine = api.mySubs();
  const working = mine.filter(s => s.status === 'working');
  const submitted = mine.filter(s => s.status === 'submitted');
  const changes = mine.filter(s => s.status === 'changes');
  const done = mine.filter(s => s.status === 'approved');
  return (
    <Shell>
      <h1>Hey, {user.name.split(' ')[0]}</h1>
      <p className="lead">Pick a project, build it, ship it, get reviewed.</p>
      <Stats items={[
        ['WORKING ON', working.length],
        ['SUBMITTED', submitted.length],
        ['CHANGES NEEDED', changes.length, changes.length ? 'var(--bad)' : undefined],
        ['APPROVED', done.length, 'var(--ok)'],
      ]} />
      {mine.length > 0 && <>
        <h2>Your active work</h2>
        {mine.map(s => <SubCard key={s.id} s={s} />)}
      </>}
      <h2>Find a project</h2>
      <div className="grid g3">
        {api.listProjects().slice(0, 3).map(p => (
          <div className="card" key={p.id}>
            <b style={{ display: 'block', marginBottom: 8 }}>{p.title}</b>
            <div className="mono" style={{ color: 'var(--mut)' }}>{api.subsOf(p.id).length}/{p.slots} SLOTS TAKEN</div>
            <span className="act" onClick={() => openModal(<ProjectModal projectId={p.id} />)}>View →</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* ---------- projects ---------- */

export function Projects() {
  const { user, route } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const filters = user ? ['all', 'open', 'full', 'mine'] : ['all', 'open', 'full'];
  const projects = api.listProjects().filter(p => {
    if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
    const full = api.subsOf(p.id).length >= p.slots;
    if (filter === 'open') return !full;
    if (filter === 'full') return full;
    if (filter === 'mine') return user ? api.subsOf(p.id).some(s => s.junior === user.id) : false;
    return true;
  });
  return (
    <Shell>
      <h1>Projects</h1>
      <p className="lead">Posted by seniors · subscribe, build, submit your repo.</p>
      <div style={{ marginBottom: 6 }}>
        <input placeholder="Search projects…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="chips">
        {filters.map(f => (
          <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {projects.length === 0
        ? <div className="empty">No projects match.</div>
        : <div className="grid g3">
          {projects.map(p => {
            const cnt = api.subsOf(p.id).length, full = cnt >= p.slots;
            return (
              <div className="card" key={p.id}>
                <div className="mono" style={{ color: 'var(--mut)' }}>BY {userName(p.senior).toUpperCase()}</div>
                <b style={{ display: 'block', margin: '10px 0 6px', fontSize: 16 }}>{p.title}</b>
                <p style={{ fontSize: 13, color: 'var(--mut)', marginBottom: 10 }}>{p.desc}</p>
                <div style={{ marginBottom: 12 }}><RatingBadge userId={p.senior} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Pill kind={full ? 'warn' : 'ok'}>{cnt}/{p.slots} slots</Pill>
                  <OpenLink id={p.id} />
                </div>
              </div>
            );
          })}
        </div>}
    </Shell>
  );
}

function OpenLink({ id }) {
  const { openModal } = useApp();
  return <span className="act" onClick={() => openModal(<ProjectModal projectId={id} />)}>View →</span>;
}

/* ---------- my subs / my projects ---------- */

export function MySubs() {
  const { user, go } = useApp();
  const mine = api.mySubs();
  return (
    <Shell>
      <h1>My work</h1>
      <p className="lead">Everything you subscribed to, and its review status.</p>
      {mine.length
        ? mine.map(s => <SubCard key={s.id} s={s} />)
        : <>
          <div className="empty">Nothing yet — browse projects and subscribe to one.</div>
          <br /><button className="btn acc" onClick={() => go('projects')}>Browse projects →</button>
        </>}
    </Shell>
  );
}

export function MyProjects() {
  const { user, go, openModal } = useApp();
  const mine = api.myProjects();
  return (
    <Shell>
      <h1>My projects</h1>
      <p className="lead">Projects you posted as a senior.</p>
      <div style={{ marginBottom: 18 }}>
        <button className="btn acc sm" onClick={() => go('newproject')}>+ Post new project</button>
      </div>
      {mine.length
        ? <div className="grid g2">
          {mine.map(p => {
            const cnt = api.subsOf(p.id).length;
            return (
              <div className="card" key={p.id}>
                <div className="mono" style={{ color: 'var(--mut)' }}>{p.id}</div>
                <b style={{ display: 'block', margin: '8px 0 6px', fontSize: 16 }}>{p.title}</b>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Pill kind={cnt >= p.slots ? 'warn' : 'ok'}>{cnt}/{p.slots} slots</Pill>
                  <Pill kind="blue">disc: {p.discord}</Pill>
                </div>
                <span className="act" onClick={() => openModal(<ProjectModal projectId={p.id} />)}>Manage juniors →</span>
              </div>
            );
          })}
        </div>
        : <div className="empty">No projects yet. Post your first one and get free dev help.</div>}
    </Shell>
  );
}

/* ---------- new project ---------- */

export function NewProject() {
  const { user, go, refresh, toast } = useApp();
  const [t, setT] = useState(''), [d, setD] = useState(''), [sl, setSl] = useState(3), [c, setC] = useState('');
  const [file, setFile] = useState(null), [err, setErr] = useState('');


  if (!user || user.role !== 'senior') return <Login />;
  const submit = async () => {
    try {
      await api.createProject({ title: t, description: d, slots: parseInt(sl, 10), discordInvite: c, pdf: file });
      toast('Project published — juniors can now subscribe');
      refresh(); go('myprojects');
    } catch (e) { setErr(e.message); }
  };
  return (
    <Shell>
      <h1>Post a project</h1>
      <p className="lead">Set the requirements, the slots, and your Discord.</p>
      <div className="card" style={{ maxWidth: 640 }}>
        <label>Project title</label><input value={t} onChange={e => setT(e.target.value)} placeholder="e.g. Task Manager REST API" />
        <label>Short description</label><input value={d} onChange={e => setD(e.target.value)} placeholder="What the junior will build, in one sentence" />
        <label>Requirements (PDF)</label>
        <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} />
        <div className="mono" style={{ color: 'var(--mut)', fontSize: 10.5, marginTop: 6 }}>Upload the full requirements as a PDF — juniors will open it from the project page.</div>
        <label>Max juniors (slots)</label><input type="number" min="1" max="20" value={sl} onChange={e => setSl(e.target.value)} />
        <label>Your Discord invite (create a channel for this project)</label>
        <input value={c} onChange={e => setC(e.target.value)} placeholder="discord.gg/yourserver" />
        {err && <div className="card" style={{ borderLeft: '3px solid var(--bad)', padding: '12px 16px', marginTop: 14, fontSize: 13.5 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => go('myprojects')}>Cancel</button>
          <button className="btn acc" onClick={submit}>Publish project →</button>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- leaderboard ---------- */

export function Leaderboard() {
  const [tab, setTab] = useState('juniors');
  const juniors = api.leaderboardJuniors();
  const seniors = api.leaderboardSeniors();
  const maxXpJ = Math.max(1, ...juniors.map(r => r.xp));
  const maxXpS = Math.max(1, ...seniors.map(r => r.xp));
  const rank = i => i === 0 ? '★' : String(i + 1).padStart(2, '0');
  return (
    <Shell>
      <h1>Leaderboard</h1>
      <p className="lead">Ranked by XP — earned on every project shipped and validated.</p>
      <div className="chips">
        <button className={`chip ${tab === 'juniors' ? 'on' : ''}`} onClick={() => setTab('juniors')}>Juniors</button>
        <button className={`chip ${tab === 'seniors' ? 'on' : ''}`} onClick={() => setTab('seniors')}>Seniors</button>
      </div>
      {tab === 'juniors'
        ? <div className="tblw"><table>
          <tr><th>#</th><th>Junior</th><th>XP</th><th>Subscriptions</th><th>Approved</th></tr>
          {juniors.length ? juniors.map((r, i) => (
            <tr key={r.user.id}>
              <td className={`mono ${i === 0 ? 'rank1' : ''}`} style={i === 0 ? undefined : { color: 'var(--mut)' }}>{rank(i)}</td>
              <td><span className="avsm">{r.user.name.charAt(0)}</span><b>{r.user.name}</b></td>
              <td className="mono"><b>{r.xp}</b> xp<XpBar xp={r.xp} maxXp={maxXpJ} /></td>
              <td>{r.subCount}</td>
              <td><Pill kind={r.approvedCount ? 'ok' : 'neutral'}>{r.approvedCount}</Pill></td>
            </tr>
          )) : <tr><td colSpan="5" style={{ color: 'var(--mut)', textAlign: 'center', padding: 26 }}>No juniors yet</td></tr>}
        </table></div>
        : <div className="tblw"><table>
          <tr><th>#</th><th>Senior</th><th>XP</th><th>Projects validated</th><th>Rating</th></tr>
          {seniors.length ? seniors.map((r, i) => (
            <tr key={r.user.id}>
              <td className={`mono ${i === 0 ? 'rank1' : ''}`} style={i === 0 ? undefined : { color: 'var(--mut)' }}>{rank(i)}</td>
              <td><span className="avsm">{r.user.name.charAt(0)}</span><b>{r.user.name}</b></td>
              <td className="mono"><b>{r.xp}</b> xp<XpBar xp={r.xp} maxXp={maxXpS} /></td>
              <td>{r.validated}</td>
              <td><RatingBadge userId={r.user.id} /></td>
            </tr>
          )) : <tr><td colSpan="5" style={{ color: 'var(--mut)', textAlign: 'center', padding: 26 }}>No seniors yet</td></tr>}
        </table></div>}
    </Shell>
  );
}

/* ---------- profile ---------- */

export function Profile() {
  const { user, refresh, toast, openModal } = useApp();
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(user.name), [l, setL] = useState(user.linkedin || '');
  const [p1, setP1] = useState(''), [p2, setP2] = useState(''), [err, setErr] = useState('');
  if (!user) return <Login />;
  const roleClass = user.role === 'senior' ? 'blue' : user.role === 'admin' ? 'grad' : 'ok';
  const save = async () => {
    if (!n.trim()) { setErr('Name cannot be empty'); return; }
    if (p1 || p2) {
      if (p1.length < 8) { setErr('New password must be ≥ 8 characters'); return; }
      if (p1 !== p2) { setErr('Passwords do not match'); return; }
    }
    await api.updateMe({ name: n.trim(), linkedin: l.trim(), password: p1 || undefined });
    setEditing(false);
    toast('Profile updated');
    refresh();
  };
  return (
    <Shell>
      <h1>Profile</h1>
      <p className="lead">Your account.</p>
      <div className="card" style={{ maxWidth: 560, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="av" style={{ width: 56, height: 56, fontSize: 20 }}>{user.name.charAt(0)}</span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <b style={{ fontSize: 18 }}>{user.name}</b>
          <div className="mono" style={{ color: 'var(--mut)' }}>{user.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Pill kind={roleClass}>{user.role.toUpperCase()}</Pill>
            {user.role !== 'admin' && <Pill kind="neutral">{user.xp || 0} XP</Pill>}
            {user.role === 'senior' && <RatingBadge userId={user.id} />}
          </div>
        </div>
      </div>

      {user.role === 'senior' && (
        <>
          <h2>Reviews from juniors</h2>
          {api.reviewsForSenior(user.id).length
            ? <div className="card" style={{ maxWidth: 560 }}>
              {api.reviewsForSenior(user.id).map(r => (
                <div className="reviewrow" key={r.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b>{userName(r.junior)}</b>
                    <span className="mono" style={{ color: 'var(--mut)' }}>{r.ago}</span>
                  </div>
                  <Stars value={r.stars} />
                  {r.comment && <p style={{ marginTop: 6, color: 'var(--mut)', fontSize: 13.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
            : <div className="empty" style={{ maxWidth: 560 }}>No reviews yet — they show up once juniors rate your feedback.</div>}
        </>
      )}

      {user.role === 'junior' && (
        <>
          <h2>Progress</h2>
          <div className="card" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--mut)' }}>
                {api.mySubs().filter(s => s.status === 'approved').length} PROJECTS APPROVED
              </span>
              <Pill kind="neutral">{user.xp || 0} XP</Pill>
            </div>
            <div className="xpbar" style={{ marginTop: 12 }}><i style={{ width: `${Math.min(100, (user.xp || 0) / 5)}%` }} /></div>
            <div className="mono" style={{ color: 'var(--mut)', marginTop: 8, fontSize: 10.5 }}>
              {Math.max(0, 500 - (user.xp || 0))} XP TO SENIOR TRACK
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn gh sm" onClick={() => openModal(<SeniorRequestModal />)}>Request senior promotion</button>
            </div>
          </div>
          {user.seniorReq && (
            <div className="card" style={{ maxWidth: 560, marginTop: 12, borderLeft: '3px solid var(--warn)' }}>
              <b className="mono" style={{ fontSize: 10.5, letterSpacing: '.07em', color: 'var(--mut)' }}>SENIOR REQUEST · {user.seniorReq.status.toUpperCase()} · {user.seniorReq.ago}</b><br />
              LinkedIn: {user.seniorReq.linkedin}
            </div>
          )}
        </>
      )}

      <h2>Account settings</h2>
      <div className="card" style={{ maxWidth: 560 }}>
        {!editing ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="mono" style={{ color: 'var(--mut)', fontSize: 10.5, letterSpacing: '.07em' }}>NAME</div>
                <b>{user.name}</b>
              </div>
              <button className="btn sm" onClick={() => { setEditing(true); setErr(''); }}>Edit profile</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="mono" style={{ color: 'var(--mut)', fontSize: 10.5, letterSpacing: '.07em' }}>LINKEDIN</div>
              {user.linkedin || <span style={{ color: 'var(--mut)' }}>Not set</span>}
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="mono" style={{ color: 'var(--mut)', fontSize: 10.5, letterSpacing: '.07em' }}>PASSWORD</div>
              <span style={{ color: 'var(--mut)' }}>••••••••</span>
            </div>
          </>
        ) : (
          <>
            <label>Name</label><input value={n} onChange={e => setN(e.target.value)} />
            <label>LinkedIn</label><input value={l} onChange={e => setL(e.target.value)} placeholder="linkedin.com/in/you" />
            <label>New password (leave blank to keep)</label><input type="password" value={p1} onChange={e => setP1(e.target.value)} />
            <label>Confirm new password</label><input type="password" value={p2} onChange={e => setP2(e.target.value)} />
            {err && <div className="card" style={{ borderLeft: '3px solid var(--bad)', padding: '12px 16px', marginTop: 14, fontSize: 13.5 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn acc" onClick={save}>Save</button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

/* ---------- notifications ---------- */

export function Notifs() {
  const { user } = useApp();
  const list = api.myNotifs();
  return (
    <Shell>
      <h1>Notifications</h1>
      <p className="lead">Updates about your projects and reviews.</p>
      {list.length
        ? <div style={{ maxWidth: 640 }}>
          {list.map(n => (
            <div className="card" key={n.id} style={{
              marginBottom: 10,
              borderLeft: `3px solid ${n.kind === 'ok' ? 'var(--ok)' : n.kind === 'bad' ? 'var(--bad)' : 'var(--acc)'}`,
              display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <span style={{ flex: 1, minWidth: 200 }}>{n.txt}</span>
              <span className="mono" style={{ color: 'var(--mut)' }}>{n.ago}</span>
            </div>
          ))}
        </div>
        : <div className="empty">No notifications yet.</div>}
    </Shell>
  );
}

/* ---------- admin ---------- */

export function Admin() {
  const { user, refresh, toast, go } = useApp();
  if (!user) return <Login />;
  if (user.role !== 'admin') return (
    <Shell><div className="empty">Admins only.</div></Shell>
  );
  const st = api.adminStats();
  const pend = api.pendingSeniorRequests();
  const users = (function listUsers() {
    // api doesn't expose listUsers; derive from leaderboard + seniors + admins
    const seen = new Map();
    api.leaderboardJuniors().forEach(r => seen.set(r.user.id, r.user));
    api.leaderboardSeniors().forEach(r => seen.set(r.user.id, r.user));
    // demo admin account known ids 1-4 fallback
    return [...seen.values()];
  })();

  return (
    <Shell>
      <h1>Admin panel</h1>
      <p className="lead">Platform overview and senior request moderation.</p>
      <Stats items={[
        ['USERS', st.users],
        ['PROJECTS', st.projects],
        ['SUBSCRIPTIONS', st.subs],
        ['PENDING SENIOR REQS', st.pendingSeniorReqs, st.pendingSeniorReqs ? 'var(--warn)' : undefined],
      ]} />
      <h2>Senior requests</h2>
      {pend.length
        ? pend.map(u => (
          <div className="card" key={u.id} style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="avsm">{u.name.charAt(0)}</span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <b>{u.name}</b>
              <div className="mono" style={{ color: 'var(--mut)' }}>{u.seniorReq.linkedin} · {u.seniorReq.ago}</div>
            </div>
            <button className="btn ok sm" onClick={async () => {
              await api.decideSeniorRequest(u.id, true);
              toast('Approved — user is now senior'); refresh();
            }}>Approve</button>
            <button className="btn sm" onClick={async () => {
              await api.decideSeniorRequest(u.id, false);
              toast('Rejected'); refresh();
            }}>Reject</button>
          </div>
        ))
        : <div className="empty">No pending requests.</div>}
      <h2>Force promote</h2>
      <div className="card" style={{ maxWidth: 640 }}>
        <p style={{ color: 'var(--mut)', fontSize: 13.5, marginBottom: 12 }}>Promote a junior to senior directly, without a request.</p>
        {users.filter(u => u.role === 'junior').map(u => (
          <div key={u.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <span className="avsm">{u.name.charAt(0)}</span>
            <b style={{ flex: 1 }}>{u.name}</b>
            <button className="btn gh sm" onClick={async () => {
              await api.forceSenior(u.id);
              toast(`${u.name} is now senior`); refresh();
            }}>Promote to senior</button>
          </div>
        ))}
      </div>
      <h2>Danger zone</h2>
      <div className="card" style={{ maxWidth: 640, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--mut)', flex: 1, minWidth: 200 }}>Reset all demo data (users, projects, submissions, reviews).</span>
        <button className="btn sm" style={{ color: 'var(--bad)' }} onClick={() => { if (confirm('Reset all demo data?')) api.resetDemo(); }}>Reset demo data</button>
      </div>
    </Shell>
  );
}

/* ---------- top drawer (mobile) ---------- */

export function Drawer() {
  const { user, route, go, logout, closeDrawer } = useApp();
  if (!user) return null;
  const links = user.role === 'admin'
    ? [['admin', '⚑ Admin panel'], ['projects', '▤ All projects'], ['leaderboard', '↑ Leaderboard']]
    : user.role === 'senior'
      ? [['dash', '◧ Desk'], ['projects', '▤ All projects'], ['myprojects', '✦ My projects'], ['leaderboard', '↑ Leaderboard']]
      : [['dash', '⌂ Dashboard'], ['projects', '▤ Browse projects'], ['mysubs', '≡ My work'], ['leaderboard', '↑ Leaderboard']];
  links.push(['profile', '◎ Profile'], ['notifs', '◇ Notifications']);
  return (
    <div className="drawer" onClick={e => e.stopPropagation()}>
      {links.map(([r, label]) => (
        <a key={r} className={route === r ? 'on' : ''} onClick={() => { go(r); closeDrawer(); }}>{label}</a>
      ))}
      <a onClick={() => { logout(); closeDrawer(); }} style={{ color: 'var(--bad)' }}>⏻ Sign out</a>
    </div>
  );
}
