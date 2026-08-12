import React, { useEffect, useRef, useState } from "react";

/**
 * SunRise — l'expérience 3D signature d'Héméra ("Le Lever")
 * -----------------------------------------------------------------------
 * Un soleil stylisé se lève au chargement, puis traverse tout le flux
 * narratif de la page au fil du défilement :
 *   dawn        → lever initial (déjà en place)
 *   clouded     → un nuage passe devant, la lumière baisse (section Problème)
 *   breakthrough→ le nuage se dissipe, le soleil retrouve son éclat (Solution)
 *   zenith      → pleine lumière, stable (Preuve)
 *   settled     → le soleil se réduit et s'installe discrètement en fond (CTA)
 *
 * Dégradation automatique et responsable :
 *  - Si WebGL n'est pas disponible, si l'utilisateur préfère les animations
 *    réduites, ou sur un appareil visiblement modeste, on ne charge JAMAIS
 *    three.js — le halo CSS statique déjà en place reste seul visible.
 *  - three.js est chargé dynamiquement (import() à la demande).
 */

function supportsRichExperience() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// Réglages cibles par phase narrative — le rendu interpole en douceur
// (lerp) vers ces valeurs à chaque changement de phase, jamais de saut brut.
const PHASE_TARGETS = {
  dawn:         { glow: 0.25, cloud: 0,    scale: 1.0,  yOffset: 0 },
  clouded:      { glow: 0.10, cloud: 0.6,  scale: 1.0,  yOffset: 0 },
  breakthrough: { glow: 0.42, cloud: 0,    scale: 1.04, yOffset: 0 },
  zenith:       { glow: 0.48, cloud: 0,    scale: 1.08, yOffset: 0.3 },
  settled:      { glow: 0.2,  cloud: 0,    scale: 0.65, yOffset: -0.8 },
};

export default function SunRise({ size = 900, phase = "dawn" }) {
  const containerRef = useRef(null);
  const [active, setActive] = useState(false);
  const phaseRef = useRef(phase);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (!supportsRichExperience()) return; // dégradation silencieuse vers le halo CSS statique
    setActive(true);

    let renderer, scene, camera, sun, glow, cloud, particles, frameId;
    let disposed = false;

    import("three").then((THREE) => {
      if (disposed || !containerRef.current) return;
      const el = containerRef.current;
      const width = el.clientWidth;
      const height = el.clientHeight;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 8;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      el.appendChild(renderer.domElement);

      // Le soleil — cœur ambré
      const sunGeo = new THREE.SphereGeometry(1.15, 48, 48);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xd9641e });
      sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.y = -4.5; // part sous l'horizon
      scene.add(sun);

      // Halo lumineux autour du soleil (glow low-tech, sans post-processing)
      const glowGeo = new THREE.SphereGeometry(1.9, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xf2a93c, transparent: true, opacity: 0.25,
      });
      glow = new THREE.Mesh(glowGeo, glowMat);
      sun.add(glow);

      // Le nuage — une sphère aplatie, translucide, qui glisse devant le soleil
      const cloudGeo = new THREE.SphereGeometry(2.6, 24, 24);
      cloudGeo.scale(1.4, 0.55, 1);
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0x8a7a9a, transparent: true, opacity: 0,
      });
      cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(-6, 0.4, 1.5); // hors champ à gauche par défaut
      scene.add(cloud);

      // Particules de lumière en dérive
      const particleCount = 60;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0xf5c98a, size: 0.045, transparent: true, opacity: 0.55,
      });
      particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      const clock = new THREE.Clock();
      const RISE_DURATION = 2.4; // secondes
      const REST_Y = 0.4;
      const LERP_SPEED = 1.8; // vitesse de transition entre phases

      // État courant interpolé (démarre sur les valeurs de "dawn")
      const current = { ...PHASE_TARGETS.dawn };

      function lerp(a, b, t) { return a + (b - a) * t; }

      function animate() {
        frameId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const dt = Math.min(clock.getDelta(), 0.05);

        // Lever initial (une seule fois, indépendant des phases narratives)
        if (t < RISE_DURATION) {
          const p = t / RISE_DURATION;
          const eased = 1 - Math.pow(1 - p, 3);
          sun.position.y = -4.5 + eased * (REST_Y + 4.5);
        } else {
          const target = PHASE_TARGETS[phaseRef.current] || PHASE_TARGETS.dawn;
          const k = 1 - Math.exp(-LERP_SPEED * dt); // lissage exponentiel, doux et stable

          current.glow = lerp(current.glow, target.glow, k);
          current.cloud = lerp(current.cloud, target.cloud, k);
          current.scale = lerp(current.scale, target.scale, k);
          current.yOffset = lerp(current.yOffset, target.yOffset, k);

          const breathe = Math.sin((t - RISE_DURATION) * 0.6) * 0.05;
          sun.position.y = REST_Y + current.yOffset + breathe;
          sun.rotation.y += 0.0015;
          sun.scale.setScalar(current.scale);
          glowMat.opacity = current.glow;

          cloudMat.opacity = current.cloud * 0.85;
          const cloudTargetX = current.cloud > 0.05 ? 0 : -6;
          cloud.position.x = lerp(cloud.position.x, cloudTargetX, k);
        }

        particles.rotation.y += 0.0006;
        const posAttr = particles.geometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
          posAttr.array[i * 3 + 1] += 0.0025;
          if (posAttr.array[i * 3 + 1] > 4) posAttr.array[i * 3 + 1] = -4;
        }
        posAttr.needsUpdate = true;

        renderer.render(scene, camera);
      }
      animate();

      const handleResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      containerRef.current._cleanup = () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(frameId);
        sunGeo.dispose(); sunMat.dispose();
        glowGeo.dispose(); glowMat.dispose();
        cloudGeo.dispose(); cloudMat.dispose();
        particleGeo.dispose(); particleMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    }).catch(() => {
      // Échec de chargement de three.js (réseau, etc.) : on reste sur le halo CSS
      setActive(false);
    });

    return () => {
      disposed = true;
      containerRef.current?._cleanup?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "fixed", top: "-5%", left: "50%",
        transform: "translateX(-50%)",
        width: size, height: size, maxWidth: "140vw",
        pointerEvents: "none", zIndex: 0,
        opacity: active ? 1 : 0,
        transition: "opacity 1.2s ease-in",
      }}
    />
  );
}
