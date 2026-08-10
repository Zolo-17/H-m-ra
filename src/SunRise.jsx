import React, { useEffect, useRef, useState } from "react";

/**
 * SunRise — l'expérience 3D signature d'Héméra ("Le Lever")
 * -----------------------------------------------------------------------
 * Un soleil stylisé se lève doucement derrière le titre du hero, puis
 * respire lentement en fond, entouré de particules de lumière en dérive.
 *
 * Dégradation automatique et responsable :
 *  - Si WebGL n'est pas disponible, ou si l'utilisateur préfère les
 *    animations réduites (accessibilité), ou sur un appareil visiblement
 *    modeste (peu de cœurs CPU), on ne charge JAMAIS three.js — le halo
 *    statique déjà en place (dégradé CSS) reste seul visible.
 *  - three.js est chargé dynamiquement (import() à la demande), jamais
 *    inclus dans le chargement initial du reste du site.
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

export default function SunRise({ size = 900 }) {
  const containerRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supportsRichExperience()) return; // dégradation silencieuse vers le halo CSS statique
    setActive(true);

    let renderer, scene, camera, sun, glow, particles, frameId;
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

      function animate() {
        frameId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        if (t < RISE_DURATION) {
          const p = t / RISE_DURATION;
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubique
          sun.position.y = -4.5 + eased * (REST_Y + 4.5);
        } else {
          const breathe = Math.sin((t - RISE_DURATION) * 0.6) * 0.05;
          sun.position.y = REST_Y + breathe;
          sun.rotation.y += 0.0015;
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
        position: "absolute", top: "-10%", left: "50%",
        transform: "translateX(-50%)",
        width: size, height: size, maxWidth: "140vw",
        pointerEvents: "none", zIndex: 0,
        opacity: active ? 1 : 0,
        transition: "opacity 1.2s ease-in",
      }}
    />
  );
}
