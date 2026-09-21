import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneDemo } from './SceneDemo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SceneDemo />
  </StrictMode>,
);
