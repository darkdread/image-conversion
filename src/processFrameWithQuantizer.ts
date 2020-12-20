import { NeuQuant } from "./neuquant.js";
import imageDataToRGB from "./imageDataToRGB";

function componentizedPaletteToArray(paletteRGB) {
  paletteRGB = paletteRGB || [];

  let paletteArray = [];

  for (let i = 0; i < paletteRGB.length; i += 3) {
      let r = paletteRGB[i];
      let g = paletteRGB[i + 1];
      let b = paletteRGB[i + 2];

      paletteArray.push(r << 16 | g << 8 | b);
  }

  return paletteArray;
}

/**
 * 将File（Blob）对象转变为一个dataURL字符串
 * https://github.com/yahoo/gifshot/blob/master/src/gifshot.js
 *
 * @param {ImageData} imageData
 * @param {number} width
 * @param {number} height
 * @param {number} sampleInterval
 * @returns {Array} Promise含有一个dataURL字符串参数
 */
export default function processFrameWithQuantizer(imageData: ImageData, width: number, height: number, sampleInterval: number) {
  let rgbComponents = imageDataToRGB(Array.prototype.slice.call(imageData.data), width, height);
  let numberPixels: number = width * height;

  let nq = NeuQuant(rgbComponents, rgbComponents.length, sampleInterval);
  
  let paletteRGBnq = nq.process();
  let paletteArray: any = [];

  // Check line 1135, gifshot.js.
  paletteArray = new Uint32Array(componentizedPaletteToArray(paletteRGBnq));
  let indexedPixels: any = new Uint8Array(numberPixels);
  let k = 0;

  for (let i = 0; i < numberPixels; i++) {
      let r: number = rgbComponents[k++];
      let g: number = rgbComponents[k++];
      let b: number = rgbComponents[k++];

      indexedPixels[i] = nq.map(r, g, b);
  }

  return {
      pixels: indexedPixels,
      palette: paletteArray
  };
}