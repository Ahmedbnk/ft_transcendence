import React, { useState } from 'react';
import { useApp } from './store';
import { seniorRatingSummary, userName, projectById } from './api';
import * as api from './api';

export const Pill = ({ kind, children }) => {
  const cls = { ok: 'pg', warn: 'py', bad: 'pr', blue: 'pb', neutral: 'pn', gold: 'pw', grad: 'pa' }[kind] || 'pn';
  return <span className={`pill ${cls}`}>{children}</span>;
};

export const SubPill = ({ status }) => ({
  working: <Pill kind="blue">working</Pill>,
  submitted: <Pill kind="warn">submitted</Pill>,
  approved: <Pill kind="ok">approved</Pill>,
  changes: <Pill kind="bad">changes needed</Pill>,
}[status] || null);

export function Stars({ value, onPick }) {
  return (
    <span className="starrow">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}
          className={`star ${i <= value ? 'on' : ''}`}
          style={onPick ? { cursor: 'pointer' } : undefined}
          onClick={onPick ? () => onPick(i) : undefined}>
          {i <= value ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

export function RatingBadge({ userId }) {
  const r = seniorRatingSummary(userId);
  if (!r.count) return <Pill kind="neutral">No reviews yet</Pill>;
  return <Pill kind="gold">★ {r.avg.toFixed(1)} · {r.count} review{r.count > 1 ? 's' : ''}</Pill>;
}

export function XpBar({ xp, maxXp, width = 80 }) {
  return (
    <div className="xpbar" style={{ width }}>
      <i style={{ width: `${Math.round(xp / maxXp * 100)}%` }} />
    </div>
  );
}

export function ReqsBadge({ project, onView }) {
  if (project.pdf && project.pdf.data) {
    return (
      <span className="act mono" onClick={(e) => { e.stopPropagation(); onView(project); }}>
        📄 {project.pdf.name} — view requirements ↗
      </span>
    );
  }
  return <span className="mono" style={{ color: 'var(--mut)' }}>No PDF requirements uploaded</span>;
}

export function ModalHost() {
  const { modal, closeModal } = useApp();
  if (!modal) return null;
  return (
    <div className="ov" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal">{modal.content}</div>
    </div>
  );
}

export function ToastHost() {
  const { toast } = useApp();
  // toasts are rendered from store's internal state via context — simplest is a portal-less stack:
  return null; // replaced in App.jsx (Toasts component)
}

/* ---------- modals used across views ---------- */

// export function SubDetailModal({ subId }) {
//   const { openModal, closeModal, user, go, refresh, toast } = useApp();
//   const s = (window.__subs || []).find(x => x.id === subId); // filled by caller — see views.jsx helpers
//   // (kept simple: views pass prebuilt content instead; this component is a placeholder)
//   return null;
// }

export function ProjectModal({ projectId }) {
  const { closeModal, user, go, refresh, toast } = useApp();
  const p = projectById(projectId);
  if (!p) return null;
  const u = user;
  const cnt = api.subsOf(p.id).length;
  const full = cnt >= p.slots;
  const mySub = u ? api.subsOf(p.id).find(s => s.junior === u.id) : null;
  const isOwner = u && u.id === p.senior;
  const senior = api.userById(p.senior);
  const [repo, setRepo] = useState(mySub ? mySub.repo : '');

  const doSubscribe = async () => {
    try { await api.subscribe(p.id); toast('Subscribed! Create your GitHub repo and start building.'); refresh(); }
    catch (e) { toast(e.message); }
  };
  const doSubmitRepo = async () => {
    try { await api.submitRepo(mySub.id, repo); toast('Repo submitted — the senior will review it'); refresh(); }
    catch (e) { toast(e.message); }
  };
  const doResubmit = async () => {
    await api.resubmit(mySub.id);
    toast('Re-submitted for review'); refresh();
  };

  return (
    <>
      <div className="mono" style={{ color: 'var(--mut)' }}>{p.id} · POSTED BY {userName(p.senior).toUpperCase()}</div>
      <h1 style={{ fontSize: 22, margin: '8px 0 6px' }}>{p.title}</h1>
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span className="avsm" style={{ width: 30, height: 30, fontSize: 11 }}>{userName(p.senior).charAt(0)}</span>
        <div>
          <b style={{ fontSize: 13.5 }}>{userName(p.senior)}</b>
          <div className="mono" style={{ color: 'var(--mut)', fontSize: 10.5 }}>{senior.xp || 0} XP</div>
        </div>
        <div style={{ flex: 1 }} />
        <RatingBadge userId={p.senior} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Pill kind={full ? 'warn' : 'ok'}>{cnt}/{p.slots} slots</Pill>{' '}
        <Pill kind="blue">disc: {p.discord}</Pill>
      </div>
      <p style={{ color: 'var(--mut)' }}>{p.desc}</p>
      <h2 style={{ margin: '22px 0 8px' }}>Requirements</h2>
      <div className="card">
        <ReqsBadge project={p} onView={(pp) => { if (!pp.pdf?.data) { toast('No PDF requirements uploaded'); return; } window.open(pp.pdf.data, '_blank'); }} />
      </div>
      <h2 style={{ margin: '22px 0 8px' }}>Communication</h2>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span>💬 Questions &amp; final review happen on Discord</span>
        <div style={{ flex: 1 }} />
        <button className="btn gh sm" onClick={() => toast('Opening Discord… (demo)')}>{p.discord} ↗</button>
      </div>

      {isOwner && (
        <>
          <h2 style={{ margin: '22px 0 8px' }}>Your juniors ({cnt})</h2>
          {cnt ? api.subsOf(p.id).map(s => (
            <div key={s.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="avsm">{userName(s.junior).charAt(0)}</span>
              <b>{userName(s.junior)}</b>
              <div style={{ flex: 1 }} />
              <SubPill status={s.status} />
              {s.status === 'submitted' && <button className="btn ok sm" onClick={() => openReviewModal(s.id)}>Review →</button>}
            </div>
          )) : <div className="empty">No subscribers yet.</div>}
        </>
      )}

      {!isOwner && u && (
        <div style={{ marginTop: 22 }}>
          {mySub ? (
            <div className="card" style={{ borderLeft: '3px solid var(--acc)' }}>
              <b>You are subscribed</b> <SubPill status={mySub.status} />
              {(mySub.status === 'working' || mySub.status === 'changes') && (
                <div style={{ marginTop: 14 }}>
                  <label>Your GitHub repo link</label>
                  <input placeholder="https://github.com/you/repo" value={repo} onChange={e => setRepo(e.target.value)} />
                  <button className="btn acc sm" style={{ marginTop: 12 }} onClick={doSubmitRepo}>Submit for review →</button>
                  {mySub.feedback && (
                    <div className="card" style={{ marginTop: 12, borderLeft: '3px solid var(--acc)', fontSize: 13.5 }}>
                      <b style={{ fontSize: 11, letterSpacing: '.07em', color: 'var(--mut)' }}>SENIOR FEEDBACK</b><br />{mySub.feedback}
                    </div>
                  )}
                  {mySub.status === 'changes' && (
                    <button className="btn sm" style={{ marginTop: 12 }} onClick={doResubmit}>Re-submit after changes</button>
                  )}
                </div>
              )}
            </div>
          ) : full ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--mut)' }}>Project is full — {cnt}/{p.slots} juniors subscribed.</div>
          ) : (
            <>
              <button className="btn acc" style={{ width: '100%' }} onClick={doSubscribe}>Subscribe to this project ({cnt}/{p.slots})</button>
              <div className="mono" style={{ color: 'var(--mut)', textAlign: 'center', marginTop: 10 }}>THEN CREATE YOUR OWN GITHUB REPO AND BUILD IT</div>
            </>
          )}
        </div>
      )}

      {!u && (
        <div className="card" style={{ textAlign: 'center', marginTop: 20 }}>
          <div className="mono" style={{ color: 'var(--mut)', marginBottom: 10 }}>{cnt}/{p.slots} slots taken</div>
          <div style={{ color: 'var(--mut)', fontSize: 13.5, marginBottom: 14 }}>Sign in to subscribe and start building this project.</div>
          <button className="btn acc sm" onClick={() => go('login')}>Sign in</button>{' '}
          <button className="btn gh sm" onClick={() => go('register')}>Create account</button>
        </div>
      )}

      <div style={{ marginTop: 18, textAlign: 'right' }}>
        <button className="btn" onClick={closeModal}>Close</button>
      </div>
    </>
  );
}

export function openReviewModal(openModal, subId, refresh, toast, closeModal, confetti) {
  const s = (window.__allSubs || []).find(x => x.id === subId);
  return null;
}

export function ReviewModal({ subId }) {
  const { closeModal, refresh, toast } = useApp();
  const [sub, setSub] = useState(null);
  React.useEffect(() => {
    import('./api').then(m => {
      // find sub across all projects
      const all = [];
      m.listProjects().forEach(p => m.subsOf(p.id).forEach(s => all.push(s)));
      setSub(all.find(x => x.id === subId));
    });
  }, [subId]);
  if (!sub) return null;
  const p = projectById(sub.project);
  const [verdict, setVerdict] = useState('approved');
  const [feedback, setFeedback] = useState('');

  const send = async () => {
    const res = await api.sendReview(sub.id, verdict, feedback.trim());
    closeModal();
    toast(res.approved ? 'Approved — junior notified' : 'Changes requested');
    if (res.approved && confetti) confetti();
    refresh();
  };

  return (
    <>
      <div className="mono" style={{ color: 'var(--mut)' }}>REVIEW · {p.id}</div>
      <h1 style={{ fontSize: 21, margin: '8px 0' }}>{userName(sub.junior)} — {p.title}</h1>
      <div className="card mono" style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '14px 0', flexWrap: 'wrap' }}>
        <span>📦</span>
        <span style={{ wordBreak: 'break-all' }}>{sub.repo || 'No repo submitted yet'}</span>
        <div style={{ flex: 1 }} />
        <button className="btn gh sm" onClick={() => toast('Opening repo… (demo)')}>Open ↗</button>
      </div>
      <label>Verdict</label>
      <div className="chips" style={{ margin: '6px 0' }}>
        <button className={`chip ${verdict === 'approved' ? 'on' : ''}`} onClick={() => setVerdict('approved')}>✓ Approve</button>
        <button className={`chip ${verdict === 'changes' ? 'on' : ''}`} onClick={() => setVerdict('changes')}>↺ Request changes</button>
      </div>
      <label>Feedback for the junior</label>
      <textarea rows="4" placeholder="What was good, what to improve…" value={feedback} onChange={e => setFeedback(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn acc" onClick={send}>Send review</button>
      </div>
    </>
  );
}

export function RateModal({ subId }) {
  const { closeModal, refresh, toast } = useApp();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [sub, setSub] = useState(null);
  React.useEffect(() => {
    const all = [];
    api.listProjects().forEach(p => api.subsOf(p.id).forEach(s => all.push(s)));
    setSub(all.find(x => x.id === subId));
  }, [subId]);
  if (!sub) return null;
  const p = projectById(sub.project);

  const submit = async () => {
    await api.submitRating(subId, stars, comment.trim());
    closeModal();
    toast('Thanks — rating submitted');
    refresh();
  };

  return (
    <>
      <div className="mono" style={{ color: 'var(--mut)' }}>RATE THE REVIEW · {p.id}</div>
      <h1 style={{ fontSize: 21, margin: '8px 0' }}>{userName(p.senior)} — {p.title}</h1>
      <p style={{ color: 'var(--mut)', fontSize: 13.5 }}>How was the code review you got? This is visible on {userName(p.senior)}'s profile.</p>
      <label>Rating</label>
      <Stars value={stars} onPick={setStars} />
      <label>Comment (optional)</label>
      <textarea rows="4" placeholder="What was helpful, what could be clearer…" value={comment} onChange={e => setComment(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn acc" onClick={submit}>Submit rating</button>
      </div>
    </>
  );
}

export function SeniorRequestModal() {
  const { closeModal, user, refresh, toast } = useApp();
  const [link, setLink] = useState(user.linkedin || '');
  const [err, setErr] = useState('');
  const send = async () => {
    if (!link.trim()) { setErr('LinkedIn is required to request senior promotion.'); return; }
    try {
      await api.updateMe({ linkedin: link.trim() });
      await api.requestSenior(link.trim());
      closeModal();
      toast('Request sent — an admin will review it');
      refresh();
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <>
      <div className="mono" style={{ color: 'var(--mut)' }}>SENIOR PROMOTION</div>
      <h1 style={{ fontSize: 21, margin: '8px 0 6px' }}>Request senior promotion</h1>
      <p style={{ color: 'var(--mut)', fontSize: 13.5, marginBottom: 14 }}>
        A LinkedIn profile is required so an admin can verify you before approving.
      </p>
      <label>LinkedIn profile URL</label>
      <input placeholder="linkedin.com/in/you" value={link} onChange={e => setLink(e.target.value)} />
      {err && <div className="card" style={{ borderLeft: '3px solid var(--bad)', padding: '12px 16px', marginTop: 14, fontSize: 13.5 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn acc" onClick={send}>Send request →</button>
      </div>
    </>
  );
}

export function SubDetailModal({ subId }) {
  const { closeModal, user, refresh, toast, openModal } = useApp();
  const all = [];
  api.listProjects().forEach(p => api.subsOf(p.id).forEach(s => all.push(s)));
  const s = all.find(x => x.id === subId);
  if (!s) return null;
  const p = projectById(s.project);
  if (!p) return null;
  const isSenior = user && user.id === p.senior;
  const [repo, setRepo] = useState(s.repo);

  return (
    <>
      <div className="mono" style={{ color: 'var(--mut)' }}>{p.id} · {s.ago}</div>
      <h1 style={{ fontSize: 21, margin: '8px 0 4px' }}>{p.title}</h1>
      <div style={{ marginBottom: 14 }}><SubPill status={s.status} /></div>
      <p style={{ color: 'var(--mut)', marginBottom: 14 }}>{p.desc}</p>
      <h2 style={{ margin: '18px 0 8px' }}>Requirements</h2>
      <div className="card">
        <ReqsBadge project={p} onView={(pp) => { if (!pp.pdf?.data) { toast('No PDF requirements uploaded'); return; } window.open(pp.pdf.data, '_blank'); }} />
      </div>
      <h2 style={{ margin: '18px 0 8px' }}>{isSenior ? `${userName(s.junior)}'s submission` : 'Your submission'}</h2>
      <div className="card mono" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>📦</span>
        <span style={{ wordBreak: 'break-all' }}>{s.repo || 'No repo submitted yet'}</span>
        {s.repo && <><div style={{ flex: 1 }} /><button className="btn gh sm" onClick={() => toast('Opening repo… (demo)')}>Open ↗</button></>}
      </div>
      {!isSenior && s.status === 'working' && (
        <div style={{ marginTop: 14 }}>
          <label>Your GitHub repo link</label>
          <input placeholder="https://github.com/you/repo" value={repo} onChange={e => setRepo(e.target.value)} />
          <button className="btn acc sm" style={{ marginTop: 12 }} onClick={async () => {
            try { await api.submitRepo(s.id, repo); toast('Repo submitted — the senior will review it'); refresh(); }
            catch (e) { toast(e.message); }
          }}>Submit for review →</button>
        </div>
      )}
      {s.feedback && (
        <>
          <h2 style={{ margin: '18px 0 8px' }}>Senior feedback</h2>
          <div className="card" style={{ borderLeft: '3px solid var(--acc)', fontSize: 13.5 }}>{s.feedback}</div>
        </>
      )}
      {isSenior && s.status === 'submitted' && (
        <div style={{ marginTop: 16 }}>
          <button className="btn ok sm" onClick={() => openModal(<ReviewModal subId={s.id} />)}>Review submission →</button>
        </div>
      )}
      {!isSenior && s.status === 'changes' && (
        <div style={{ marginTop: 16 }}>
          <button className="btn acc sm" onClick={async () => { await api.resubmit(s.id); toast('Re-submitted for review'); refresh(); }}>Re-submit after changes</button>
        </div>
      )}
      {!isSenior && (s.status === 'approved' || s.status === 'changes') && !s.rated && (
        <div style={{ marginTop: 16 }}>
          <button className="btn gh sm" onClick={() => openModal(<RateModal subId={s.id} />)}>★ Rate this review</button>
        </div>
      )}
      <div style={{ marginTop: 18, textAlign: 'right' }}>
        <button className="btn" onClick={closeModal}>Close</button>
      </div>
    </>
  );
}

export function Confetti() {
  React.useEffect(() => {
    const colors = ['#2E5BFF', '#8B5CF6', '#1E9E5A', '#E8B23D', '#D64545'];
    const els = [];
    for (let i = 0; i < 80; i++) {
      const c = document.createElement('div');
      c.className = 'cf';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
      c.style.animationDuration = (2 + Math.random() * 2) + 's';
      c.style.animationDelay = (Math.random() * .4) + 's';
      document.body.appendChild(c);
      els.push(c);
      setTimeout(() => c.remove(), 4500);
    }
    return () => els.forEach(e => e.remove());
  }, []);
  return null;
}
