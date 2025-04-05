'use client';

import { useEffect, useState } from 'react';
import { Devnet } from './components/Devnet';
import { init } from './fhevmjs';
import { Connect } from './components/Connect';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Trick to avoid double init with HMR
    if (window.fhevmjsInitialized) return;
    window.fhevmjsInitialized = true;
    init()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((e) => {
        console.log(e);
        setIsInitialized(false);
      });
  }, []);

  if (!isInitialized) return null;

  return (
    <>
      <h1>fhevmjs</h1>
      <Connect>{(account, provider) => <Devnet account={account} provider={provider} />}</Connect>
      <p className="read-the-docs">
        <a href="https://docs.zama.ai/fhevm">!See the documentation for more information</a>
      </p>
    </>
  );
}

export default App;
