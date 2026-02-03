import type { Model3DM, Shape3DM } from "./types";

/**
 * Парсит текст .3dm (Lua-подобная таблица) в Model3DM.
 * Поддерживает форматы:
 * - { shapes = { [1] = { [1]=minX, [2]=minY, ... texture = "..." }, ... } }
 * - { { minX, minY, minZ, maxX, maxY, maxZ, texture = "..." }, ... }
 * - с полями label, tooltip, collidable и т.д.
 */
export function parse3dm(text: string): Model3DM {
  const result: Model3DM = { shapes: [] };

  // Извлечь значение поля shapes: shapes = { или ["shapes"] = {
  const shapesMatch = text.match(/(?:\[\s*"shapes"\s*\]|shapes)\s*=\s*\{/);
  let shapesBlock: string;
  if (shapesMatch) {
    const start = shapesMatch.index! + shapesMatch[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    shapesBlock = text.slice(start, i - 1);
  } else {
    // Весь файл — одна таблица с элементами-формами
    const firstBrace = text.indexOf("{");
    if (firstBrace === -1) throw new Error("Invalid 3dm: no table found");
    let depth = 1;
    let i = firstBrace + 1;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    shapesBlock = text.slice(firstBrace + 1, i - 1);
  }

  // Опционально: label, tooltip (поддержка ["key"] = "value")
  const labelMatch = text.match(/(?:\[\s*"label"\s*\]|label)\s*=\s*"([^"]*)"/);
  if (labelMatch) result.label = labelMatch[1];
  const tooltipMatch = text.match(/(?:\[\s*"tooltip"\s*\]|tooltip)\s*=\s*"([^"]*)"/);
  if (tooltipMatch) result.tooltip = tooltipMatch[1];

  // Парсим каждую форму в shapesBlock
  const shapeEntries = splitTopLevel(shapesBlock, "{", "}");
  for (const entry of shapeEntries) {
    const shape = parseShapeEntry(entry);
    if (shape) result.shapes.push(shape);
  }

  return result;
}

function splitTopLevel(block: string, open: string, close: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < block.length) {
    const nextOpen = block.indexOf(open, i);
    if (nextOpen === -1) break;
    let depth = 1;
    let j = nextOpen + open.length;
    while (j < block.length && depth > 0) {
      if (block.substring(j, j + open.length) === open) depth++;
      else if (block.substring(j, j + close.length) === close) depth--;
      j++;
    }
    out.push(block.slice(nextOpen, j));
    i = j;
  }
  return out;
}

function parseShapeEntry(entry: string): Shape3DM | null {
  // texture = "..." или ["texture"] = "..."
  const textureMatch = entry.match(/(?:\[\s*"texture"\s*\]|texture)\s*=\s*"([^"]*)"/);
  const texture = textureMatch ? textureMatch[1] : "planks_oak";

  // tint = число (опционально)
  const tintMatch = entry.match(/(?:\[\s*"tint"\s*\]|tint)\s*=\s*(\d+)/);
  const tint = tintMatch ? parseInt(tintMatch[1], 10) : undefined;

  // Индексированные [1]=minX, [2]=minY, [3]=minZ, [4]=maxX, [5]=maxY, [6]=maxZ
  const indexedMatches = entry.matchAll(/\[\s*(\d+)\s*\]\s*=\s*(-?\d+)/g);
  const indexed: Record<number, number> = {};
  for (const m of indexedMatches) {
    indexed[parseInt(m[1], 10)] = parseInt(m[2], 10);
  }
  if (indexed[1] != null && indexed[2] != null && indexed[3] != null && indexed[4] != null && indexed[5] != null && indexed[6] != null) {
    return {
      minX: indexed[1],
      minY: indexed[2],
      minZ: indexed[3],
      maxX: indexed[4],
      maxY: indexed[5],
      maxZ: indexed[6],
      texture,
      ...(tint != null && { tint }),
    };
  }

  // Плоский список чисел: minX, minY, minZ, maxX, maxY, maxZ
  const plainNums = entry.match(/\b(\d+)\s*[,}]/g);
  if (plainNums) {
    const nums = plainNums.slice(0, 6).map((s) => parseInt(s.replace(/\D/g, ""), 10));
    if (nums.length >= 6)
      return {
        minX: Math.min(nums[0], nums[3]),
        minY: Math.min(nums[1], nums[4]),
        minZ: Math.min(nums[2], nums[5]),
        maxX: Math.max(nums[0], nums[3]),
        maxY: Math.max(nums[1], nums[4]),
        maxZ: Math.max(nums[2], nums[5]),
        texture,
      };
  }
  return null;
}

/** Сериализует Model3DM в текст .3dm (как в твоём примере: shapes с [1]..[6] и texture). */
export function serialize3dm(model: Model3DM): string {
  const lines: string[] = ["{"];
  if (model.label != null) lines.push(`  label = "${escapeLua(model.label)}",`);
  if (model.tooltip != null) lines.push(`  tooltip = "${escapeLua(model.tooltip)}",`);
  if (model.lightLevel != null) lines.push(`  lightLevel = ${model.lightLevel},`);
  if (model.emitRedstone != null) lines.push(`  emitRedstone = ${model.emitRedstone},`);
  if (model.buttonMode != null) lines.push(`  buttonMode = ${model.buttonMode},`);
  if (model.collidable != null)
    lines.push(`  collidable = { ${model.collidable[0]}, ${model.collidable[1]} },`);
  lines.push("  shapes = {");
  model.shapes.forEach((s, i) => {
    const state = s.state != null ? `, state = ${s.state}` : "";
    const tint = s.tint != null ? `, tint = ${s.tint}` : "";
    lines.push(
      `    [${i + 1}] = { [1] = ${s.minX}, [2] = ${s.minY}, [3] = ${s.minZ}, [4] = ${s.maxX}, [5] = ${s.maxY}, [6] = ${s.maxZ}, texture = "${escapeLua(s.texture)}"${state}${tint} },`
    );
  });
  lines.push("  }");
  lines.push("}");
  return lines.join("\n");
}

function escapeLua(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
