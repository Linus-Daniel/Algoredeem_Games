import GameLibrary from '../../components/GameLibrary';
export const metadata={title:'Your favorites',robots:{index:false,follow:true}};
export default function Favorites(){return <main id="mainContent" className="innerPage"><GameLibrary favoritesOnly/></main>;}
