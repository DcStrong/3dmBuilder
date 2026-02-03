/** Один параллелепипед (shape) в формате 3D принтера OpenComputers */
export interface Shape3DM {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  texture: string;
  state?: boolean;
  tint?: number;
}

/** Полная модель .3dm для print3d */
export interface Model3DM {
  label?: string;
  tooltip?: string;
  lightLevel?: number;
  emitRedstone?: boolean;
  buttonMode?: boolean;
  collidable?: [boolean, boolean];
  shapes: Shape3DM[];
}

export const GRID_SIZE = 16;
export const MAX_SHAPES = 256;
