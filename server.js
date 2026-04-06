import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { PousseJeu } from './src/Game.js';

const server = Server({
  games: [PousseJeu],
  // On autorise tout le monde (Origins.ALL) pour que le tunnel Serveo laisse passer ton ami
  origins: [Origins.ALL], 
});

const PORT = process.env.PORT || 8000;

server.run(PORT, () => {
  console.log(`✅ L'Arbitre de La Poussette tourne sur le port ${PORT}...`);
});