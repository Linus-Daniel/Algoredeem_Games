'use client';
import { useProfile } from './ProfileProvider';
export default function FavoriteButton({id}){const{profile,store}=useProfile(),favorite=profile.favorites.includes(id);return <button className="iconButton" aria-pressed={favorite} onClick={()=>store.toggleFavorite(id)}>{favorite?'♥':'♡'} Favorite</button>;}
