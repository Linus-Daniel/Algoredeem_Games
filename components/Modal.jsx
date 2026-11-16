'use client';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
export default function Modal({ title, children, onClose }) {
  const ref = useRef(null), id = useId();
  useEffect(() => {
    const previous = document.activeElement, app = document.getElementById('platformApp');
    if (app) app.inert = true; document.body.classList.add('modalOpen'); document.dispatchEvent(new Event('algoredeem:modal')); ref.current.focus();
    const key = e => { if(e.key==='Escape'){e.preventDefault();onClose();} if(e.key==='Tab'){ const list=[...ref.current.querySelectorAll('button:not(:disabled),a[href],input,select')]; const first=list[0],last=list.at(-1); if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){e.preventDefault();first?.focus();} } };
    document.addEventListener('keydown',key);
    return () => { document.removeEventListener('keydown',key); if(app)app.inert=false; document.body.classList.remove('modalOpen'); if(previous?.isConnected)previous.focus(); };
  },[onClose]);
  return typeof document === 'undefined' ? null : createPortal(<div className="modalWrap" role="dialog" aria-modal="true" aria-labelledby={id} onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modalCard" tabIndex={-1} ref={ref}><h2 id={id}>{title}</h2>{children}<div className="modalButtons"><button className="secondary" onClick={onClose}>Close</button></div></div></div>, document.body);
}
