import React, { useState, useEffect, useMemo, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as satellite from 'satellite.js';
import * as THREE from 'three';

const App: React.FC = () => {
  const globeEl = useRef<any>();
  const [satData, setSatData] = useState<any[]>([]);
  const [selectedSat, setSelectedSat] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle')
      .then(res => res.text())
      .then(tleText => {
        const lines = tleText.split('\n');
        const data = [];
        const gmst = satellite.gstime(new Date());

        for (let i = 0; i < lines.length - 2; i += 3) {
          const name = lines[i].trim();
          try {
            const satrec = satellite.twoline2satrec(lines[i+1], lines[i+2]);
            const posAndVel = satellite.propagate(satrec, new Date()) as any;
            if (posAndVel.position) {
              const gd = satellite.eciToGeodetic(posAndVel.position, gmst);
              
              let orbitPath = [];
              for (let j = 0; j < 100; j += 5) {
                const t = new Date(new Date().getTime() + j * 60000);
                const p = (satellite.propagate(satrec, t) as any).position;
                const g = satellite.eciToGeodetic(p, satellite.gstime(t));
                orbitPath.push([satellite.degreesLong(g.longitude), satellite.degreesLat(g.latitude), g.height / 1000]);
              }

              data.push({
                name,
                lat: satellite.degreesLat(gd.latitude),
                lng: satellite.degreesLong(gd.longitude),
                alt: gd.height / 1000 / 6371,
                path: orbitPath,
                details: {
                  history: "Launched via heavy-lift rockets. Part of global infrastructure.",
                  scientists: "Built on principles by Newton & Kepler.",
                  physics: "In constant 'Free Fall' at 17,500 mph."
                }
              });
            }
          } catch (e) {}
        }
        setSatData(data);
      });
  }, []);

  useEffect(() => {
    if (!globeEl.current) return;
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(1, 1, 1);
    globeEl.current.scene().add(sunLight);
    globeEl.current.scene().add(new THREE.AmbientLight(0x333333));
  }, []);

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: 'white', fontFamily: 'sans-serif' }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere={true}
        atmosphereColor="#87CEEB"
        atmosphereAltitude={0.25}

        objectsData={satData}
        objectLat="lat"
        objectLng="lng"
        objectAltitude="alt"
        objectThreeObject={(d: any) => {
          const isSel = selectedSat?.name === d.name;
          const geometry = new THREE.BoxGeometry(isSel ? 0.015 : 0.005, isSel ? 0.015 : 0.005, isSel ? 0.015 : 0.005);
          const material = new THREE.MeshPhongMaterial({ color: isSel ? '#FFFF00' : '#FFFFFF' });
          return new THREE.Mesh(geometry, material);
        }}
        onObjectClick={(obj) => setSelectedSat(obj)}

        pathsData={satData.filter(s => s === selectedSat || s.name.includes("ISS"))}
        pathPoints="path"
        pathPointLat={(p: any) => p[1]}
        pathPointLng={(p: any) => p[0]}
        pathPointAlt={(p: any) => p[2]}
        pathColor={(d: any) => d.name === selectedSat?.name ? '#FFFF00' : '#FFFFFF'}
        pathStroke={2}
      />

      {/* FIXED 12-HOUR CLOCK */}
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '10px', border: '1px solid #FFFF00', fontSize: '18px' }}>
        TIME: {currentTime.toLocaleTimeString('en-US', { hour12: true })}
      </div>

      {selectedSat && (
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: '400px', background: 'rgba(0,0,0,0.95)', padding: '25px', borderRadius: '15px', border: '2px solid #FFFF00' }}>
          <button onClick={() => setSelectedSat(null)} style={{ float: 'right', color: 'white', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
          <h2 style={{ color: '#FFFF00', marginTop: 0 }}>{selectedSat.name}</h2>
          <p><strong>Scientists:</strong> {selectedSat.details.scientists}</p>
          <p><strong>The Physics:</strong> {selectedSat.details.physics}</p>
        </div>
      )}

      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <h1 style={{ margin: 0, color: '#FFFF00' }}>COMMAND CENTER</h1>
        <p>Live tracking {satData.length} objects</p>
      </div>
    </div>
  );
};

export default App;