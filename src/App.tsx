import { useState, useCallback } from "react";
import { Scene3D } from "./Scene3D";
import { parse3dm, serialize3dm } from "./format3dm";
import type { Shape3DM, Model3DM } from "./types";
import { GRID_SIZE, MAX_SHAPES } from "./types";
import { TEXTURE_NAMES } from "./textures";
import "./App.css";

type Tool = "voxel" | "box" | "erase";

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [shapes, setShapes] = useState<Shape3DM[]>([]);
  const [tool, setTool] = useState<Tool>("voxel");
  const [currentTexture, setCurrentTexture] = useState<string>("planks_oak");
  const [boxFirstCorner, setBoxFirstCorner] = useState<[number, number, number] | null>(null);
  const [label, setLabel] = useState("");
  const [tooltip, setTooltip] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addShape = useCallback((shape: Shape3DM) => {
    setShapes((prev) => {
      if (prev.length >= MAX_SHAPES) return prev;
      return [...prev, shape];
    });
    setError(null);
  }, []);

  const removeShape = useCallback((index: number) => {
    setShapes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const loadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const model = parse3dm(text);
        setShapes(model.shapes ?? []);
        setLabel(model.label ?? "");
        setTooltip(model.tooltip ?? "");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки .3dm");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const export3dm = useCallback(() => {
    const model: Model3DM = {
      label: label || undefined,
      tooltip: tooltip || undefined,
      shapes,
    };
    const text = serialize3dm(model);
    downloadFile(text, "model.3dm");
  }, [shapes, label, tooltip]);

  const exportText = useCallback(() => {
    const model: Model3DM = { shapes };
    const text = serialize3dm(model);
    downloadFile(text, "model.txt");
  }, [shapes]);

  return (
    <div className="app">
      <header className="header">
        <h1>OC 3DM Editor</h1>
        <p className="subtitle">Редактор моделей для 3D принтера OpenComputers</p>
      </header>

      <div className="toolbar">
        <div className="tool-group">
          <span className="label">Инструмент:</span>
          <button
            className={tool === "voxel" ? "active" : ""}
            onClick={() => { setTool("voxel"); setBoxFirstCorner(null); }}
          >
            Воксель
          </button>
          <button
            className={tool === "box" ? "active" : ""}
            onClick={() => setTool("box")}
          >
            Бокс
          </button>
          <button
            className={tool === "erase" ? "active" : ""}
            onClick={() => { setTool("erase"); setBoxFirstCorner(null); }}
          >
            Ластик
          </button>
        </div>

        <div className="tool-group">
          <span className="label">Текстура:</span>
          <select
            value={currentTexture}
            onChange={(e) => setCurrentTexture(e.target.value)}
          >
            {TEXTURE_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-group">
          <label>
            Label: <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Метка модели"
            />
          </label>
        </div>
        <div className="tool-group">
          <label>
            Tooltip: <input
              type="text"
            value={tooltip}
            onChange={(e) => setTooltip(e.target.value)}
            placeholder="Подсказка"
          />
          </label>
        </div>

        <div className="tool-group actions">
          <label className="file-label">
            Загрузить .3dm
            <input
              type="file"
              accept=".3dm,.txt"
              onChange={loadFile}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={export3dm}>Сохранить .3dm</button>
          <button onClick={exportText}>Сохранить .txt</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {boxFirstCorner && (
        <div className="hint">
          Режим «Бокс»: выберите второй угол (сейчас выбран {boxFirstCorner.join(", ")}).
        </div>
      )}
      {shapes.length >= MAX_SHAPES && (
        <div className="warning">Достигнут лимит {MAX_SHAPES} форм.</div>
      )}

      <div className="main">
        <div className="scene-wrap">
          <Scene3D
            shapes={shapes}
            onAddShape={addShape}
            onRemoveShape={removeShape}
            tool={tool}
            currentTexture={currentTexture}
            boxFirstCorner={boxFirstCorner}
            setBoxFirstCorner={setBoxFirstCorner}
          />
        </div>
        <aside className="sidebar">
          <h3>Формы ({shapes.length} / {MAX_SHAPES})</h3>
          <p className="grid-info">Сетка 0…{GRID_SIZE - 1} по X, Y, Z.</p>
          <ul className="shape-list">
            {shapes.map((s, i) => (
              <li key={i}>
                <span className="shape-desc">
                  [{s.minX},{s.minY},{s.minZ}] → [{s.maxX},{s.maxY},{s.maxZ}] {s.texture}
                </span>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeShape(i)}
                  title="Удалить"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
