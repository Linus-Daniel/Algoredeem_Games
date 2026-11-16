const { games, byId } = require('../assets/catalog.js');
const categories = ['All games', 'Racing', 'Sports', 'Action', 'Music', 'Arcade', 'Puzzle', 'Strategy', 'Memory', 'Words', 'Quick play'];
const gameHref = (game) => '/games/' + game.id + '/';
const poster = (game) => '/assets/posters/' + game.id + '.svg';
function selectGames({ query = '', category = 'All games', sort = 'featured', favoritesOnly = false, profile = {} } = {}) {
  const favorites = profile.favorites || [], recent = profile.recent || [];
  const list = games.filter(g => (!favoritesOnly || favorites.includes(g.id)) && (category === 'All games' || g.category === category) && (g.title + ' ' + g.description + ' ' + g.category).toLowerCase().includes(query.toLowerCase()));
  if (sort === 'az') list.sort((a,b) => a.title.localeCompare(b.title));
  else if (sort === 'recent') { const rank = g => recent.includes(g.id) ? recent.indexOf(g.id) : 99; list.sort((a,b) => rank(a) - rank(b)); }
  else list.sort((a,b) => Number(!!b.arena) - Number(!!a.arena));
  return list;
}
module.exports = { games, byId, categories, gameHref, poster, selectGames };
