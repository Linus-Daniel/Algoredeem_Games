import Catalog from '../lib/catalog.cjs';
export const dynamic='force-static';
export default function sitemap(){const base=(process.env.SITE_URL||'http://localhost:3000').replace(/\/$/,'');return [{url:base+'/',changeFrequency:'weekly',priority:1},...Catalog.games.map(g=>({url:base+Catalog.gameHref(g),changeFrequency:'monthly',priority:.8}))];}
