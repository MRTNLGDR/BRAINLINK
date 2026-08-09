/* BRAINLINK_LOCAL_AI_PROVIDER_ROUTER */
import { useState } from 'react';

import { Component as AffineCloudAI } from './affine-cloud';
import { BrainlinkLocalAI } from './brainlink-local-ai';

const cloudRequested = () =>
  new URLSearchParams(window.location.search).get('provider') ===
  'affine-cloud';

export const Component = () => {
  const [showCloud, setShowCloud] = useState(cloudRequested);

  if (!showCloud) {
    return <BrainlinkLocalAI />;
  }

  return (
    <>
      <AffineCloudAI />
      <button
        onClick={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('provider');
          window.history.replaceState(null, '', url);
          setShowCloud(false);
        }}
        style={{
          position: 'fixed',
          right: 16,
          top: 10,
          zIndex: 1000,
          height: 32,
          padding: '0 11px',
          color: '#dedede',
          background: '#242424',
          border: '1px solid #3a3a3a',
          borderRadius: 7,
          font: 'inherit',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        Local-first provider
      </button>
    </>
  );
};
