'use client';
import Link from 'next/link';
import Catalog from '../lib/catalog.cjs';
import { useProfile } from './ProfileProvider';
export default function GameCard({ game }) {
  const { profile,store }=useProfile(), favorite=profile.favorites.includes(game.id), href=Catalog.gameHref(game);
  return <article className="gameCard" style={{'--accent':game.accent}}><Link className="gameCover" href={href} aria-label={'Play '+game.title}><img src={Catalog.poster(game)} alt="" width="640" height="400" loading="lazy"/><span className="coverBadge">{game.tag}</span></Link><button className="cardFavorite" aria-label={'Favorite '+game.title} aria-pressed={favorite} onClick={()=>store.toggleFavorite(game.id)}>{favorite?'♥':'♡'}</button><div className="gameCardInfo"><div className="gameMeta"><span>{game.category}</span><span>{game.minutes} min</span></div><h3><Link href={href}>{game.title}</Link></h3><p>{game.description}</p><Link className="cardPlay" href={href}><span>Play now</span><span aria-hidden="true">↗</span></Link></div></article>;
}
