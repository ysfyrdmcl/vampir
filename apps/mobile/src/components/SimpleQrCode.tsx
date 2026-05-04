import { StyleSheet, View } from "react-native";

const SIZE = 21;
const DATA_CODEWORDS = 19;
const EC_CODEWORDS = 7;

interface SimpleQrCodeProps {
  value: string;
  moduleSize?: number;
}

type Cell = boolean | null;

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    if (((y >>> i) & 1) !== 0) z ^= x;
  }
  return z & 0xff;
}

function reedSolomonGenerator(degree: number): number[] {
  let result = [1];
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    const next = Array.from({ length: result.length + 1 }, () => 0);
    for (let j = 0; j < result.length; j += 1) {
      next[j] ^= gfMul(result[j], root);
      next[j + 1] ^= result[j];
    }
    result = next;
    root = gfMul(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[]): number[] {
  const generator = reedSolomonGenerator(EC_CODEWORDS);
  const result = Array.from({ length: EC_CODEWORDS }, () => 0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < generator.length; i += 1) {
      result[i] ^= gfMul(generator[i], factor);
    }
  }
  return result;
}

function appendBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function makeCodewords(value: string): number[] {
  const bytes = Array.from(value, (char) => char.charCodeAt(0) & 0xff);
  const bits: number[] = [];
  appendBits(bits, 0x4, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, DATA_CODEWORDS * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  for (let pad = 0xec; data.length < DATA_CODEWORDS; pad ^= 0xec ^ 0x11) {
    data.push(pad);
  }
  return [...data, ...reedSolomonRemainder(data)];
}

function emptyMatrix(): { modules: Cell[][]; reserved: boolean[][] } {
  return {
    modules: Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null)),
    reserved: Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false))
  };
}

function setCell(modules: Cell[][], reserved: boolean[][], row: number, col: number, dark: boolean): void {
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;
  modules[row][col] = dark;
  reserved[row][col] = true;
}

function addFinder(modules: Cell[][], reserved: boolean[][], row: number, col: number): void {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      const dark = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      setCell(modules, reserved, rr, cc, dark);
    }
  }
}

function formatBits(): number {
  let data = 0b01000;
  let rem = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if (((rem >>> i) & 1) !== 0) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function addFunctionPatterns(modules: Cell[][], reserved: boolean[][]): void {
  addFinder(modules, reserved, 0, 0);
  addFinder(modules, reserved, 0, SIZE - 7);
  addFinder(modules, reserved, SIZE - 7, 0);
  for (let i = 8; i < SIZE - 8; i += 1) {
    setCell(modules, reserved, 6, i, i % 2 === 0);
    setCell(modules, reserved, i, 6, i % 2 === 0);
  }
  setCell(modules, reserved, SIZE - 8, 8, true);

  const bits = formatBits();
  for (let i = 0; i <= 5; i += 1) setCell(modules, reserved, 8, i, ((bits >>> i) & 1) !== 0);
  setCell(modules, reserved, 8, 7, ((bits >>> 6) & 1) !== 0);
  setCell(modules, reserved, 8, 8, ((bits >>> 7) & 1) !== 0);
  setCell(modules, reserved, 7, 8, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i += 1) setCell(modules, reserved, 14 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 0; i < 8; i += 1) setCell(modules, reserved, SIZE - 1 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i += 1) setCell(modules, reserved, 8, SIZE - 15 + i, ((bits >>> i) & 1) !== 0);
}

function makeMatrix(value: string): boolean[][] {
  const { modules, reserved } = emptyMatrix();
  addFunctionPatterns(modules, reserved);
  const bits = makeCodewords(value).flatMap((byte) => Array.from({ length: 8 }, (_, i) => (byte >>> (7 - i)) & 1));
  let bitIndex = 0;
  let upward = true;
  for (let col = SIZE - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let i = 0; i < SIZE; i += 1) {
      const row = upward ? SIZE - 1 - i : i;
      for (let offset = 0; offset < 2; offset += 1) {
        const cc = col - offset;
        if (reserved[row][cc]) continue;
        const dark = (bits[bitIndex++] ?? 0) !== 0;
        modules[row][cc] = dark !== ((row + cc) % 2 === 0);
      }
    }
    upward = !upward;
  }
  return modules.map((row) => row.map(Boolean));
}

export function SimpleQrCode({ value, moduleSize = 8 }: SimpleQrCodeProps) {
  const matrix = makeMatrix(value.toUpperCase());
  return (
    <View style={[styles.wrap, { padding: moduleSize * 2 }]}>
      {matrix.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((dark, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}`}
              style={[
                styles.module,
                {
                  width: moduleSize,
                  height: moduleSize,
                  backgroundColor: dark ? "#111111" : "#f1e5d3"
                }
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    backgroundColor: "#f1e5d3",
    borderRadius: 12
  },
  row: {
    flexDirection: "row"
  },
  module: {
    overflow: "hidden"
  }
});
