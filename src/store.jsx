import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as api from './api';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(api.me());
  const [route, setRoute] = useState('landing');
  const [modal, setModal] = useState(null);      // { content }
  const [toasts, setToasts] = useState([]);
  const [tick, setTick] = useState(0);           // force re-render after mutations

  const refresh = useCallback(() => { setUser(api.me()); setTick(t => t + 1); }, []);

  // const toast = useCallback((m) => {
  //   const id = Math.random();
  //   setToasts(t => [...t, { id, m }]);
  //   setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  // }, []);

const toast = useCallback((m) => { window.dispatchEvent(new CustomEvent('toast', { detail: m })); }, []);

  const go = useCallback((r) => {
    setModal(null);
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    go('landing');
    toast('Signed out');
  }, [go, toast]);

  const openModal = useCallback((content) => setModal({ content }), []);
  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeModal]);

  return (
    <Ctx.Provider value={{ user, route, go, refresh, toast, modal, openModal, closeModal, logout, tick }}>
      {children}
    </Ctx.Provider>
  );
}
