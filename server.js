import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { PousseJeu } from './src/Game.js';

const server = Server({
  games: [PousseJeu],
  origins: [
    'http://localhost:5173',
    'https://la-poussette-v3.onrender.com',
    /.*\.ngrok-free\.dev$/ // Autorise tous les liens Ngrok
  ],
});

const PORT = process.env.PORT || 8000;

server.run(PORT, () => {
  console.log(`✅ L'Arbitre de La Poussette tourne sur le port ${PORT}...`);
});
