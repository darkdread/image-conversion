import { Image2CanvasConfig } from '@models';
import { Frame, FrameOptions, GifOptions, GifReader, GifWriter } from 'omggif';
import processFrameWithQuantizer from './processFrameWithQuantizer';
import urltoBlob from './urltoBlob';

function scaleImageData(image: CanvasImageSource, scale_x: number, scale_y: number): ImageData {
  let canvas = document.createElement('canvas');
  canvas.width = image.width as number;
  canvas.height = image.height as number;

  let context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  
  let tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = image.width as number * scale_x;
  tmpCanvas.height = image.height as number * scale_y;

  let tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.scale(scale_x, scale_y);
  tmpCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

  return tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
}

function rotateCanvas(image: CanvasImageSource, orientation: number): HTMLCanvasElement {
  let canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.width = image.width as number;
  canvas.height = image.height as number;

  let context: CanvasRenderingContext2D = canvas.getContext('2d');

  return rotateCanvasInPlace(image, orientation, canvas, context);
}

function rotateCanvasInPlace(image: CanvasImageSource, orientation: number, cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  
  // 设置方向
  switch (orientation) {
    case 3:
      ctx.rotate(180 * Math.PI / 180);
      ctx.drawImage(image, -cvs.width, -cvs.height, cvs.width, cvs.height);
      break;
    case 6:
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(image, 0, -cvs.width, cvs.height, cvs.width);
      break;
    case 8:
      ctx.rotate(270 * Math.PI / 180);
      ctx.drawImage(image, -cvs.height, 0, cvs.height, cvs.width);
      break;
    case 2:
      ctx.translate(cvs.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, cvs.width, cvs.height);
      break;
    case 4:
      ctx.translate(cvs.width, 0);
      ctx.scale(-1, 1);
      ctx.rotate(180 * Math.PI / 180);
      ctx.drawImage(image, -cvs.width, -cvs.height, cvs.width, cvs.height);
      break;
    case 5:
      ctx.translate(cvs.width, 0);
      ctx.scale(-1, 1);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(image, 0, -cvs.width, cvs.height, cvs.width);
      break;
    case 7:
      ctx.translate(cvs.width, 0);
      ctx.scale(-1, 1);
      ctx.rotate(270 * Math.PI / 180);
      ctx.drawImage(image, -cvs.height, 0, cvs.height, cvs.width);
      break;
    default:
      ctx.drawImage(image, 0, 0, cvs.width, cvs.height);
  }

  return cvs;
}

function imageDataToCanvas(imageData: ImageData, width: number, height: number): HTMLCanvasElement {
  let canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  let context: CanvasRenderingContext2D = canvas.getContext('2d');
  context.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * 将一个image对象转变为一个canvas对象
 *
 * @param {image} image
 *
 * @typedef {Object=} config - 转变为canvas时的一些参数配置
 * 		@param {number} width - canvas图像的宽度，默认为image的宽度
 * 		@param {number} height - canvas图像的高度，默认为image的高度
 * 		@param {number} scale - 相对于image的缩放比例，范围0-10，默认不缩放；
 * 			设置config.scale后会覆盖config.width和config.height的设置；
 * 		@param {number} orientation - 图片旋转参数，默认不旋转，参考如下：
 * 			参数	 旋转方向
 * 			1		0°
 * 			2		水平翻转
 * 			3		180°
 * 			4		垂直翻转
 * 			5		顺时针90°+水平翻转
 * 			6		顺时针90°
 * 			7		顺时针90°+垂直翻转
 * 			8		逆时针90°
 * @type {config}
 *
 * @returns {Promise(canvas)}
 */
export default async function imagetoCanvas(image: HTMLImageElement, config: Image2CanvasConfig = {}): Promise<HTMLCanvasElement> {
  const myConfig = { ...config };
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  let height: number;
  let width: number;

  for (const i in myConfig) {
    if (Object.prototype.hasOwnProperty.call(myConfig, i)) {
      myConfig[i] = Number(myConfig[i]);
    }
  }
  // 设置宽高
  if (!myConfig.scale) {
    width = myConfig.width || myConfig.height * image.width / image.height || image.width;
    height = myConfig.height || myConfig.width * image.height / image.width || image.height;
  } else {
    // 缩放比例0-10，不在此范围则保持原来图像大小
    const scale = myConfig.scale > 0 && myConfig.scale < 10 ? myConfig.scale : 1;
    width = Math.floor(image.width * scale);
    height = Math.floor(image.height * scale);
  }

  // 当顺时针或者逆时针旋转90时，需要交换canvas的宽高
  if ([5, 6, 7, 8].some(i => i === myConfig.orientation)) {
    cvs.height = width;
    cvs.width = height;
  } else {
    cvs.height = height;
    cvs.width = width;
  }

  // GIF read/write.
  let blob = await urltoBlob(image.src);
  if (blob.type == "image/gif"){
    let buf: Uint8Array = new Uint8Array(await blob.arrayBuffer());
    let reader: GifReader = new GifReader(buf as Buffer);

    let gifOptions: GifOptions = {
      loop: reader.loopCount(),
      // background: 1
    };
    let writtenBuf: Uint8Array = new Uint8Array(width * height * reader.numFrames() * 5);
    let writer: GifWriter = new GifWriter(writtenBuf as Buffer, width, height, gifOptions);

    let imageDatas: ImageData[] = new Array(reader.numFrames());
    for (let k: number = 0; k < imageDatas.length; k++){
      let image = new ImageData(reader.width, reader.height);
      let frameInfo: Frame = reader.frameInfo(k);

      // https://github.com/CaptainCodeman/gif-player/blob/d45eecdb7458e08c565341b2eb2d68195329f247/components/gif-player/src/gif-player.js#L357
      if (k > 0 && frameInfo.disposal < 2) {
        image.data.set(new Uint8ClampedArray(imageDatas[k-1].data));
      }
      reader.decodeAndBlitFrameRGBA(k, image.data as Uint8ClampedArray);

      imageDatas[k] = image;
    };

    // Write
    imageDatas.map((image, k) => {
      let frameInfo: Frame = reader.frameInfo(k);
      let canvas: HTMLCanvasElement = imageDataToCanvas(image, image.width, image.height);
      canvas = rotateCanvas(canvas, myConfig.orientation);
      // image = imageDataToCanvas(image, image.width, image.height).getContext('2d').getImageData(0, 0, image.width, image.height);
      image = scaleImageData(canvas, width/image.width, height/image.height);

      let frameNq = processFrameWithQuantizer(image, width, height, 10);
      let frameOptions: FrameOptions = {
        palette: Array.prototype.slice.call(frameNq.palette),
        delay: frameInfo.delay,
        disposal: frameInfo.disposal,
        // transparent: frameInfo.transparent_index
      };
      writer.addFrame(0, 0, width, height, frameNq.pixels, frameOptions);
    });

    let base64Png = imageDatas.map((image, k) => {
      let canvas: HTMLCanvasElement = imageDataToCanvas(image, image.width, image.height);
      canvas = rotateCanvas(canvas, myConfig.orientation);

      return canvas.toDataURL("image/png");
    });

    console.log(base64Png);

    writer.end();

    let bufStr = bufferToString(writtenBuf);
    let gif = `data:image/gif;base64,${btoa(bufStr)}`;

    console.log(gif);
  }

  rotateCanvasInPlace(image, myConfig.orientation, cvs, ctx);

  return cvs;
};

let byteMap: string[] = [];

for (let i = 0; i < 256; i++) {
  byteMap[i] = String.fromCharCode(i);
}

function bufferToString(buffer: Uint8Array): string {
  let numberValues = buffer.length;
  let str = '';
  let x = -1;

  while (++x < numberValues) {
    str += byteMap[buffer[x]];
  }

  return str;
}