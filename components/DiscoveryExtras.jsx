'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Catalog from '../lib/catalog.cjs';
import { useProfile } from './ProfileProvider';
export function SurpriseButton(){return <button className="textLink surpriseButton" onClick={()=>{const games=Catalog.games.filter(g=>g.type!=='external');location.assign(Catalog.gameHref(games[Math.floor(Math.random()*games.length)]));}}>Surprise me →</button>;}
export function RecentGames(){const{profile}=useProfile();if(!profile.recent.length)return null;return <section className="recentSection"><div className="sectionHeading"><h2>Jump back in</h2><span>Recently played</span></div><div className="recentGames">{profile.recent.map(id=>{const g=Catalog.byId(id);return <Link key={id} className="recentGame" href={Catalog.gameHref(g)}><img src={Catalog.poster(g)} alt="" width="66" height="47"/><span><b>{g.title}</b><small>{g.category}</small></span><span aria-hidden="true">↗</span></Link>;})}</div></section>;}
export function DailyPick(){const[game,setGame]=useState(Catalog.byId('penalty'));useEffect(()=>{const now=new Date(),day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000),games=Catalog.games.slice(1);setGame(games[day%games.length]);},[]);return <section className="dailyBanner"><div className="dailyIcon" aria-hidden="true">✦</div><div><span className="eyebrow">TODAY’S PICK</span><h2>{game.title}</h2><p>{game.description}</p></div><Link className="secondary" href={Catalog.gameHref(game)}>Give it a go →</Link></section>;}
