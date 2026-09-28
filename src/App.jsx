// Hash routes, so every link works on static hosting (GitHub Pages) without a server:
//   #/                create a room / reopen one of yours (trainer)
//   #/host/ERT-1234   trainer console — this browser hosts the room
//   #/room/ERT-1234   trainee invite link
import { useEffect, useState } from 'react';
import { NewRoom, TrainerConsole } from './screens/Trainer.jsx';
import { TraineeView } from './screens/Trainee.jsx';

const current = () => location.hash.replace(/^#/, '') || '/';

function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const onHash = () => { setPath(current()); window.scrollTo(0, 0); };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  const navigate = to => { location.hash = to; };
  return [path, navigate];
}

export default function App() {
  const [path, navigate] = useRoute();
  const m = path.match(/^\/(host|room)\/([A-Za-z0-9-]+)\/?$/);
  if (m) {
    const code = m[2].toUpperCase();
    return m[1] === 'host'
      ? <TrainerConsole key={code} code={code} navigate={navigate} />
      : <TraineeView key={code} code={code} />;
  }
  return <NewRoom navigate={navigate} />;
}
