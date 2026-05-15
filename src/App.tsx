import Game from './game/Game';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#02010a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ boxShadow: '0 0 60px rgba(100, 80, 200, 0.4), 0 0 120px rgba(60,40,120,0.2)' }}>
        <Game />
      </div>
    </div>
  );
}
