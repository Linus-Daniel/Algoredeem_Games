'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from './ProfileProvider';
import { loadPlayer } from '../lib/runtime-loader';
import Catalog from '../lib/catalog.cjs';
import Modal from './Modal';
export default function GameClient({ game }) {
  const { store }=useProfile(),scope=useRef(null),controller=useRef(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[help,setHelp]=useState(false);
  const close=useCallback(()=>setHelp(false),[]);
  useEffect(()=>{
    let disposed=false;setError('');setLoading(true);
    (async()=>{
      const [Player,response]=await Promise.all([loadPlayer(),fetch('/assets/player-frame.html')]);if(!response.ok)throw new Error('Game screen could not load.');const html=await response.text();if(disposed)return;
      scope.current.innerHTML=html;
      controller.current=Player.mount(scope.current,{id:game.id,getProfile:()=>store.getSnapshot().profile,onVisit:id=>store.visit(id),onResult:(...args)=>store.result(...args),onPreferences:p=>store.preferences(p),ads:window.GameAdService,onHelp:()=>setHelp(true)});
      setLoading(false);
    })().catch(e=>{if(!disposed){setError(e.message);setLoading(false);}});
    return()=>{disposed=true;controller.current?.destroy();controller.current=null;};
  },[game.id,store,attempt]);
  useEffect(()=>store.subscribe(()=>controller.current?.refresh()),[store]);
  return <>{loading&&<div className="gameLoading"><img src={Catalog.poster(game)} alt="" width="640" height="400"/><p role="status">Loading {game.title}…</p></div>}{error&&<div className="runtimeUnavailable" role="alert"><p>{error}</p><button className="primary" onClick={()=>setAttempt(n=>n+1)}>Try again</button></div>}<div className="gameRuntime" ref={scope} hidden={loading||!!error}/>{help&&<Modal title={game.title+' — How to play'} onClose={close}><p>{game.controls}</p><p>Press P or Escape to pause. Your best score is saved when the round ends or you leave the game.</p></Modal>}</>;
}
