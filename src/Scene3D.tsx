import { useRef, useState, useMemo } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, useCursor, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Shape3DM } from "./types";
import { GRID_SIZE } from "./types";
import { useTexture } from "./useTexture";

type Tool = "voxel" | "box" | "erase";

interface Scene3DProps {
  shapes: Shape3DM[];
  onAddShape: (shape: Shape3DM) => void;
  onRemoveShape: (index: number) => void;
  tool: Tool;
  currentTexture: string;
  boxFirstCorner: [number, number, number] | null;
  setBoxFirstCorner: (v: [number, number, number] | null) => void;
}

function floorClip(v: number) {
  return Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(v)));
}

function getCellFromPoint(p: THREE.Vector3): [number, number, number] {
  return [
    floorClip(p.x),
    floorClip(p.y),
    floorClip(p.z),
  ];
}

/** Невидимый бокс 0..16 для выбора ячейки по клику */
function PickerBox({
  onCellClick,
  onHoverCell,
  tool,
  boxFirstCorner,
  setBoxFirstCorner,
  onAddShape,
  onRemoveShape,
  currentTexture,
  shapes,
}: {
  onCellClick: (cell: [number, number, number]) => void;
  onHoverCell: (cell: [number, number, number] | null) => void;
  tool: Tool;
  boxFirstCorner: [number, number, number] | null;
  setBoxFirstCorner: (v: [number, number, number] | null) => void;
  onAddShape: (shape: Shape3DM) => void;
  onRemoveShape: (index: number) => void;
  currentTexture: string;
  shapes: Shape3DM[];
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const cell = getCellFromPoint(e.point.clone());
    onHoverCell(cell);
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHoverCell(null);
  };

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const point = e.point.clone();
    const cell: [number, number, number] = getCellFromPoint(point);

    if (tool === "voxel") {
      onAddShape({
        minX: cell[0],
        minY: cell[1],
        minZ: cell[2],
        maxX: cell[0] + 1,
        maxY: cell[1] + 1,
        maxZ: cell[2] + 1,
        texture: currentTexture,
      });
      return;
    }
    if (tool === "box") {
      if (boxFirstCorner) {
        const [x1, y1, z1] = boxFirstCorner;
        const [x2, y2, z2] = cell;
        onAddShape({
          minX: Math.min(x1, x2),
          minY: Math.min(y1, y2),
          minZ: Math.min(z1, z2),
          maxX: Math.max(x1, x2) + 1,
          maxY: Math.max(y1, y2) + 1,
          maxZ: Math.max(z1, z2) + 1,
          texture: currentTexture,
        });
        setBoxFirstCorner(null);
      } else {
        setBoxFirstCorner(cell);
      }
      return;
    }
    if (tool === "erase") {
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        if (
          cell[0] >= s.minX && cell[0] < s.maxX &&
          cell[1] >= s.minY && cell[1] < s.maxY &&
          cell[2] >= s.minZ && cell[2] < s.maxZ
        ) {
          onRemoveShape(i);
          return;
        }
      }
      return;
    }
    onCellClick(cell);
  };

  return (
    <mesh
      ref={ref}
      position={[GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE / 2]}
      scale={[GRID_SIZE, GRID_SIZE, GRID_SIZE]}
      onPointerDown={handleClick}
      onPointerMove={handlePointerMove}
      onPointerOver={() => setHovered(true)}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

function ShapeMesh({
  shape,
  selected,
}: {
  shape: Shape3DM;
  index: number;
  selected: boolean;
}) {
  const cx = (shape.minX + shape.maxX) / 2;
  const cy = (shape.minY + shape.maxY) / 2;
  const cz = (shape.minZ + shape.maxZ) / 2;
  const sx = shape.maxX - shape.minX;
  const sy = shape.maxY - shape.minY;
  const sz = shape.maxZ - shape.minZ;
  const texture = useTexture(shape.texture);
  // tint из .3dm — цвет в 0xRRGGBB (умножается на текстуру); без tint — белый
  const materialColor =
    selected ? 0x4488ff : (shape.tint != null ? shape.tint : 0xffffff);

  return (
    <mesh position={[cx, cy, cz]}>
      <boxGeometry args={[sx, sy, sz]} />
      <meshStandardMaterial
        map={texture}
        metalness={0.05}
        roughness={0.9}
        color={materialColor}
      />
    </mesh>
  );
}

/** Оси X (красный), Y (зелёный), Z (синий) от 0 до GRID_SIZE */
function GridAxes() {
  const len = GRID_SIZE;
  const lines = useMemo(() => {
    const gX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(len, 0, 0),
    ]);
    const gY = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, len, 0),
    ]);
    const gZ = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, len),
    ]);
    return [
      new THREE.Line(gX, new THREE.LineBasicMaterial({ color: 0xe74c3c })),
      new THREE.Line(gY, new THREE.LineBasicMaterial({ color: 0x2ecc71 })),
      new THREE.Line(gZ, new THREE.LineBasicMaterial({ color: 0x3498db })),
    ];
  }, [len]);

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

function SceneContent(props: Scene3DProps) {
  const { shapes, boxFirstCorner } = props;
  const [hoveredCell, setHoveredCell] = useState<[number, number, number] | null>(null);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <OrbitControls makeDefault />
      {/* Сетка пола — ярче и толще */}
      <Grid
        args={[GRID_SIZE, GRID_SIZE]}
        position={[GRID_SIZE / 2, 0, GRID_SIZE / 2]}
        cellSize={1}
        cellThickness={0.8}
        cellColor="#555"
        sectionSize={4}
        sectionThickness={1.4}
        sectionColor="#888"
        fadeDistance={40}
        fadeStrength={0.8}
      />
      <GridAxes />
      <group position={[0, 0, 0]}>
        {shapes.map((s, i) => (
          <ShapeMesh
            key={i}
            shape={s}
            index={i}
            selected={false}
          />
        ))}
        {boxFirstCorner && (
          <mesh
            position={[
              boxFirstCorner[0] + 0.5,
              boxFirstCorner[1] + 0.5,
              boxFirstCorner[2] + 0.5,
            ]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={0x00ff00} wireframe />
          </mesh>
        )}
        {/* Подсветка ячейки под курсором */}
        {hoveredCell && (
          <mesh
            position={[
              hoveredCell[0] + 0.5,
              hoveredCell[1] + 0.5,
              hoveredCell[2] + 0.5,
            ]}
          >
            <boxGeometry args={[1.02, 1.02, 1.02]} />
            <meshBasicMaterial
              color={0x00aaff}
              transparent
              opacity={0.35}
              depthTest={false}
              wireframe
            />
          </mesh>
        )}
      </group>
      {/* Координаты в углу экрана */}
      {hoveredCell && (
        <Html position={[hoveredCell[0] + 0.5, hoveredCell[1] + 1.6, hoveredCell[2] + 0.5]} center>
          <div
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            X: {hoveredCell[0]} &nbsp; Y: {hoveredCell[1]} &nbsp; Z: {hoveredCell[2]}
          </div>
        </Html>
      )}
      <PickerBox
        onCellClick={() => {}}
        onHoverCell={setHoveredCell}
        tool={props.tool}
        boxFirstCorner={props.boxFirstCorner}
        setBoxFirstCorner={props.setBoxFirstCorner}
        onAddShape={props.onAddShape}
        onRemoveShape={props.onRemoveShape}
        currentTexture={props.currentTexture}
        shapes={props.shapes}
      />
    </>
  );
}

export function Scene3D(props: Scene3DProps) {
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 400 }}>
      <Canvas camera={{ position: [24, 20, 24], fov: 50 }}>
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
