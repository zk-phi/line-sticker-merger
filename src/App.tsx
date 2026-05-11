import { useState, useCallback } from 'react'
import { decode, toRGBA8, encode } from 'upng-js'

/* TODO:
   - Resize to 240x240
   - Limit loop number
 */

const SRC_SIZE = 270;
const CNUM = 256;

type DecodedPng = {
  url: string,
  dels: number[],
  frames: Uint8ClampedArray[],
};

const decodePngFile = (file: File): Promise<DecodedPng> => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const buf = e.target.result;
    const decoded = decode(buf);
    if (decoded.width !== SRC_SIZE || decoded.height !== SRC_SIZE) {
      throw new Error("Wrong image size");
    }
    const frames = toRGBA8(decoded).map((buf) => new Uint8ClampedArray(buf));
    const dels = decoded.frames.map((frame) => frame.delay);
    const url = URL.createObjectURL(new Blob([buf], { type: "image/apng" }));
    resolve({ url, frames, dels });
  };
  reader.readAsArrayBuffer(file);
});

const mergeApngs = (pngs: DecodedPng[], dels: number[]): string => {
  const canvas = document.createElement("canvas");
  canvas.width = 4 * SRC_SIZE;
  canvas.height = 4 * SRC_SIZE;
  const ctx = canvas.getContext("2d");

  const mergedFrames = [];
  for (const [i, del] of Object.entries(dels)) {
    const arr = new Uint8ClampedArray((SRC_SIZE * 2) * (SRC_SIZE * 2) * 4);
    for (let x = 0; x < SRC_SIZE; x++) {
      for (let y = 0; y < SRC_SIZE; y++) {
        const ix = y * SRC_SIZE + x;
        const ix0 = y * (SRC_SIZE * 2) + x;
        const ix1 = y * (SRC_SIZE * 2) + (x + SRC_SIZE);
        const ix2 = (y + SRC_SIZE) * (SRC_SIZE * 2) + x;
        const ix3 = (y + SRC_SIZE) * (SRC_SIZE * 2) + (x + SRC_SIZE);
        arr[ix0 * 4 + 0] = pngs[0].frames[i][ix * 4 + 0];
        arr[ix0 * 4 + 1] = pngs[0].frames[i][ix * 4 + 1];
        arr[ix0 * 4 + 2] = pngs[0].frames[i][ix * 4 + 2];
        arr[ix0 * 4 + 3] = pngs[0].frames[i][ix * 4 + 3];
        arr[ix1 * 4 + 0] = pngs[1].frames[i][ix * 4 + 0];
        arr[ix1 * 4 + 1] = pngs[1].frames[i][ix * 4 + 1];
        arr[ix1 * 4 + 2] = pngs[1].frames[i][ix * 4 + 2];
        arr[ix1 * 4 + 3] = pngs[1].frames[i][ix * 4 + 3];
        arr[ix2 * 4 + 0] = pngs[2].frames[i][ix * 4 + 0];
        arr[ix2 * 4 + 1] = pngs[2].frames[i][ix * 4 + 1];
        arr[ix2 * 4 + 2] = pngs[2].frames[i][ix * 4 + 2];
        arr[ix2 * 4 + 3] = pngs[2].frames[i][ix * 4 + 3];
        arr[ix3 * 4 + 0] = pngs[3].frames[i][ix * 4 + 0];
        arr[ix3 * 4 + 1] = pngs[3].frames[i][ix * 4 + 1];
        arr[ix3 * 4 + 2] = pngs[3].frames[i][ix * 4 + 2];
        arr[ix3 * 4 + 3] = pngs[3].frames[i][ix * 4 + 3];
      }
    }
    mergedFrames.push(arr);
  });
  const merged = encode(mergedFrames, SRC_SIZE * 2, SRC_SIZE * 2, CNUM, dels);
  return URL.createObjectURL(new Blob([merged], { type: "image/apng" }));
};

function App() {
  const [dels, setDels] = useState<number[]>([]);
  const [targets, setTargets] = useState<DecodedPng[]>([]);
  const [pngs, setPngs] = useState<DecodedPng[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const onSelectFile = useCallback(async (e) => {
    const file = e.target.files[0];
    const png = await decodePngFile(file);
    setPngs((pngs) => [...pngs, png]);
  }, [setPngs]);

  const onRemoveTarget = useCallback((i: number) => {
    setTargets((targets) => targets.filter((_, j) => i !== j));
  }, [setTargets]);

  const onSelectBase = useCallback((i: number) => {
    setDels(pngs[i].dels);
  }, [pngs, setDels]);

  const onAddTarget = useCallback((i: number) => {
    setTargets((targets) => [...targets, pngs[i]]);
  }, [pngs, dels, setTargets]);

  const onGenerate = useCallback(() => {
    setResult(mergeApngs(targets, dels));
  }, [targets, dels, setResult]);

  return (
    <>
      <div>
        Target:
      </div>
      { targets.map((target, i) => (
        <div key={i}>
          <img src={target.url} width={64} height={64} />
          <button type="button" onClick={ () => onRemoveTarget(i) }>Remove</button>
        </div>
      )) }
      <div>
        { JSON.stringify(dels) }
      </div>
      { targets.length === 4 && (
        <div>
          <button type="button" onClick={ onGenerate }>Generate</button>
        </div>
      ) }
      { result && (
        <div>
          <img src={result} />
        </div>
      ) }
      <hr />
      <input type="file" onChange={ onSelectFile } />
      { pngs.map((png, i) => (
        <section key={i}>
          <div>
            <img src={png.url} width={64} height={64} />
            { dels.length === png.dels.length && (
              <button type="button" onClick={ () => onAddTarget(i) }>Add</button>
            ) }
          </div>
          <div>
            { JSON.stringify(png.dels) }
            { !dels.length && (
              <button type="button" onClick={ () => onSelectBase(i) }>
                フレームレートをセット
              </button>
            ) }
          </div>
        </section>
      )) }
    </>
  )
}

export default App
