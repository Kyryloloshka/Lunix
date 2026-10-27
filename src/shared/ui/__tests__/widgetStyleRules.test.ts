// @types/node is not installed (Expo project); this test only needs a tiny slice of Node.
declare const require: (module: string) => any;
declare const __dirname: string;
interface DirEntry {
  name: string;
  isDirectory(): boolean;
}
const fs = require('fs');
const path = require('path');

/**
 * T-004 criterion: widgets read colors and type sizes from tokens. No hex/rgb color literals and no
 * numeric `fontSize` below the 11 pt minimum (ideally none at all: use `typography`).
 */
const WIDGETS_DIR = path.resolve(__dirname, '../../../widgets');
const MIN_FONT_SIZE = 11;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: DirEntry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('widgets use design tokens only', () => {
  const files = sourceFiles(WIDGETS_DIR);

  it('scans a non-trivial set of widget files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('contains no hex or rgb(a) color literals', () => {
    const offenders = files.flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((line: string, index: number) => ({ line, index }))
        .filter(({ line }: { line: string }) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        .map(({ index }: { index: number }) => `${path.relative(WIDGETS_DIR, file)}:${index + 1}`),
    );
    expect(offenders).toEqual([]);
  });

  it(`has no numeric fontSize below ${MIN_FONT_SIZE}`, () => {
    const offenders = files.flatMap((file) =>
      [...fs.readFileSync(file, 'utf8').matchAll(/fontSize:\s*(\d+(?:\.\d+)?)\b/g)]
        .filter((match) => Number(match[1]) < MIN_FONT_SIZE)
        .map((match) => `${path.relative(WIDGETS_DIR, file)}: fontSize ${match[1]}`),
    );
    expect(offenders).toEqual([]);
  });
});
