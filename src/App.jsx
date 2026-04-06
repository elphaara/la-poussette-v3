import React from 'react';
import { Lobby } from 'boardgame.io/react';
import { PousseJeu } from './Game.js';
import { PousseBoard } from './Board.jsx';
import './App.css'; // Si tu as du style

const App = () => (
  <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    <h1 style={{ textAlign: 'center' }}>🏆 Tournoi La Poussette V3 ⭐</h1>
    
    <Lobby
      gameServer={`https://b812978b99815a99-79-117-144-213.serveousercontent.com`}
      lobbyServer={`https://b812978b99815a99-79-117-144-213.serveousercontent.com`}
      gameComponents={[
        { game: PousseJeu, board: PousseBoard }
      ]}
      debug={false}
    />
  </div>
);

export default App;