export const dynamic='force-static';
export default function robots(){const base=process.env.SITE_URL||'http://localhost:3000';return {rules:{userAgent:'*',allow:'/',disallow:['/profile/','/favorites/']},sitemap:base+'/sitemap.xml'};}
