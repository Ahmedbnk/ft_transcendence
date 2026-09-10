import React, { useState } from 'react';
import { useApp } from './store';
import * as api from './api';
import { ModalHost } from './ui';
import {
  Landing, Login, Register, Dash, Projects, MySubs, MyProjects,
  NewProject, Leaderboard, Profile, Notifs, Admin, Drawer,
} from './views';

const TITLES = {
  landing: 'devhub', login: 'sign in', register: 'join', dash: 'dashboard',
  projects: 'projects', mysubs: 'my work', myprojects: 'my projects',
  newproject: 'post a project', leaderboard: 'leaderboard',
  profile: 'profile', notifs: 'notifications', admin: 'admin',
};

const TINTS = {
  landing: 'var(--grad)', admin: 'var(--grad)', newproject: 'var(--acc)',
  notifs: 'var(--acc)', myprojects: 'var(--acc)', leaderboard: 'var(--gold)',
};

function Toasts() {
  const [items, setItems] = useState([]);
  React.useEffect(() => {
    // piggyback: store pushes toasts via a custom event
    const on = (e) => {
      const id = Math.random();
      setItems(t => [...t, { id, m: e.detail }]);
      setTimeout(() => setItems(t => t.filter(x => x.id !== id)), 2800);
    };
    window.addEventListener('toast', on);
    return () => window.removeEventListener('toast', on);
  }, []);
  return (
    <div className="toasts">
      {items.map(t => <div className="toast" key={t.id}>{t.m}</div>)}
    </div>
  );
}

function Header({ setDrawer }) {
  const { user, route, go, logout } = useApp();
  const title = TINTS[route] ? <span style={{ color: TINTS[route] }}>{TITLES[route]}</span> : TITLES[route] || 'devhub';
  const notifCount = user ? api.myNotifs().length : 0;
  return (
    <div className="top">
      <div className="brand" onClick={() => go(user ? 'dash' : 'landing')}>
        <span className="logo">▲</span> devhub
      </div>
      <div className="mono" style={{ color: 'var(--mut)' }}>/ {title}</div>
      <div style={{ flex: 1 }} />
      {user && <span className="avsm" onClick={() => go('profile')} style={{ cursor: 'pointer' }}>{user.name.charAt(0)}</span>}
      {user
        ? <button className="btn sm" onClick={logout}>Sign out</button>
        : <>
          <button className="btn sm" onClick={() => go('login')}>Sign in</button>
          <button className="btn acc sm" onClick={() => go('register')}>Join</button>
        </>}
      {user && (
        <button className="burger" onClick={() => setDrawer(true)} aria-label="Menu">
          <span /><span /><span />
          {notifCount > 0 && <i className="nbadge">{notifCount}</i>}
        </button>
      )}
    </div>
  );
}

function DrawerWrap() {
  const { route, go, logout, user } = useApp();
  const [open, setOpen] = useState(false);
  // expose close to Drawer
  if (!open) return <button className="burger burger-fake" style={{ display: 'none' }} />;
  return null;
}

export default function App() {
  const { route, user } = useApp();
  const [drawer, setDrawer] = useState(false);

  let view = <Landing />;
  if (route === 'login') view = <Login />;
  else if (route === 'register') view = <Register />;
  else if (route === 'dash') view = user ? <Dash /> : <Login />;
  else if (route === 'projects') view = <Projects />;
  else if (route === 'mysubs') view = user ? <MySubs /> : <Login />;
  else if (route === 'myprojects') view = user ? <MyProjects /> : <Login />;
  else if (route === 'newproject') view = <NewProject />;
  else if (route === 'leaderboard') view = <Leaderboard />;
  else if (route === 'profile') view = user ? <Profile /> : <Login />;
  else if (route === 'notifs') view = user ? <Notifs /> : <Login />;
  else if (route === 'admin') view = <Admin />;
  else if (route !== 'landing') view = <Landing />;

  return (
    <>
      <Header setDrawer={setDrawer} />
      {view}
      <ModalHost />
      <Toasts />
      {drawer && (
        <div className="ov" onClick={() => setDrawer(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <DrawerLinks onGo={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function DrawerLinks({ onGo }) {
  const { route, go, logout, user } = useApp();
  if (!user) return null;
  const links = user.role === 'admin'
    ? [['admin', '⚑ Admin panel'], ['projects', '▤ All projects'], ['leaderboard', '↑ Leaderboard']]
    : user.role === 'senior'
      ? [['dash', '◧ Desk'], ['projects', '▤ All projects'], ['myprojects', '✦ My projects'], ['leaderboard', '↑ Leaderboard']]
      : [['dash', '⌂ Dashboard'], ['projects', '▤ Browse projects'], ['mysubs', '≡ My work'], ['leaderboard', '↑ Leaderboard']];
  links.push(['profile', '◎ Profile'], ['notifs', '◇ Notifications']);
  return (
    <>
      {links.map(([r, label]) => (
        <a key={r} className={route === r ? 'on' : ''} onClick={() => { go(r); onGo(); }}>{label}</a>
      ))}
      <a onClick={() => { logout(); onGo(); }} style={{ color: 'var(--bad)' }}>⏻ Sign out</a>
    </>
  );
}
