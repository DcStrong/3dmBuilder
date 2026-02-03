import { useState, useEffect } from "react";
import * as THREE from "three";

const textureCache = new Map<string, THREE.Texture>();
const fallbackCache = new Map<string, THREE.CanvasTexture>();

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous"); // нужен для текстур с f0x.me в WebGL

/** Ванильные текстуры OpenComputers 3D Designer (f0x.me) */
const VANILLA_TEXTURES_BASE =
  "https://f0x.me/OpenComputers-3D-Designer/img/resourcepacks/Vanilla/blocks/";

function vanillaTextureUrls(name: string): [string, string] {
  const encoded = name.replace(/_/g, "%5F");
  const withUnderscores = `${VANILLA_TEXTURES_BASE}${name}.png`;
  const withEncoded = `${VANILLA_TEXTURES_BASE}${encoded}.png`;
  return [withEncoded, withUnderscores];
}

/** Нейтральный fallback — серая шахматка, чтобы не путать с загруженной текстурой */
function createFallbackTexture(name: string): THREE.CanvasTexture {
  const cached = fallbackCache.get(name);
  if (cached) return cached;

  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const light = "#888";
  const dark = "#555";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? light : dark;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.strokeRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  fallbackCache.set(name, tex);
  return tex;
}

function loadTextureFromUrl(
  url: string,
  name: string
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        textureCache.set(name, tex);
        resolve(tex);
      },
      undefined,
      () => reject(new Error("Load failed"))
    );
  });
}

/**
 * Загружает текстуру: 1) локально public/textures/{name}.png,
 * 2) при отсутствии — с f0x.me (ванильные блоки OC 3D Designer),
 * 3) при ошибке — canvas fallback.
 */
function loadTexture(name: string): Promise<THREE.Texture> {
  const cached = textureCache.get(name);
  if (cached) return Promise.resolve(cached);

  const localUrl = `/textures/${name}.png`;
  const [remoteEncoded, remoteUnderscores] = vanillaTextureUrls(name);

  return loadTextureFromUrl(localUrl, name)
    .catch(() => loadTextureFromUrl(remoteEncoded, name))
    .catch(() => loadTextureFromUrl(remoteUnderscores, name))
    .catch(() => Promise.resolve(createFallbackTexture(name)));
}

/**
 * Хук: возвращает текстуру для имени (Minecraft-style, например planks_oak).
 * Сначала показывается fallback (цвет по имени), затем подставляется
 * /textures/{name}.png, если файл есть.
 */
export function useTexture(name: string): THREE.Texture {
  const [texture, setTexture] = useState<THREE.Texture>(() =>
    createFallbackTexture(name)
  );

  useEffect(() => {
    let cancelled = false;
    loadTexture(name).then((t) => {
      if (!cancelled) setTexture(t);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return texture;
}
