const data = {
    file: null,
    compress_file: null,
    runtime: null
  }

  init();

  async function init() {
    // const file = await imageConversion.urltoBlob('./images/5kiur.gif');
    // const file = await imageConversion.urltoBlob('./images/logo.gif');
    const file = await imageConversion.urltoBlob('./images/trafficlight.gif');
    // const file = await imageConversion.urltoBlob('./images/kitty.gif');
    // const file = await imageConversion.urltoBlob('http://i.imgur.com/2OO33vX.png');
    data.file = file;
    const image = await filetoImage(file);
    showMessage(file, image, "input");
    compress()
  }

  function getDom(domId) {
    return document.getElementById(domId)
  }

  async function change() {
    const file = getDom("file").files[0];
    data.file = file;
    const image = await filetoImage(file);
    showMessage(file, image, "input");
  }
  //Setting config.scale will override the settings of
  //config.width and config.height;
  function change2(type) {
    if (type === "width" || type === "height") {
      getDom("scale").value = '';
    } else if (type === "scale") {
      getDom("width").value = '';
      getDom("height").value = '';
    }
  }

  function showMessage(file, image, name) {
    const size = (file.size / 1024).toFixed(2);
    if (name === "output") {
      const origin_size = getDom("size").value;
      getDom(name + "_size").innerText = size + " KB (accuracy:" + ((1 - Math.abs(1 - size / origin_size)) * 100).toFixed(2) + "%)";
      if (data.runtime) {
        getDom(name + "_runtime").innerText = data.runtime + " ms";
      }
    } else {
      getDom("fileName").innerText = file.name || "Choose file";
      getDom(name + "_size").innerText = size + " KB";
    }
    getDom(name + "_type").innerText = file.type;
    getDom(name + "_width").innerText = image.width + " px";
    getDom(name + "_height").innerText = image.height + " px";
    getDom(name).innerHTML = '';
    getDom(name).append(image);
  }

  async function compress() {
    const file = data.file;
    const size = getDom("size").value;
    const accuracy = getDom("accuracy").value;
    const type = getDom("type").value;
    const width = getDom("width").value;
    const height = getDom("height").value;
    const scale = getDom("scale").value;
    const orientation = getDom("orientation").value;
    const startTime = Date.now();
    const compress_file = await imageConversion.compressAccurately(file, {
      size,
      accuracy,
      type,
      width,
      height,
      scale,
      orientation
    });
    data.runtime = Date.now() - startTime;
    // const compress_file = await imageConversion.compress(file, '0.83');
    const compress_image = await filetoImage(compress_file);
    // const compress_canvas = await fileToCanvas(compress_file);
    data.compress_file = compress_file;
    // showMessage(compress_file, compress_canvas, "output");
    showMessage(compress_file, compress_image, "output");
  }

  async function filetoImage(file) {
    const dataURL = await imageConversion.filetoDataURL(file);
    return await imageConversion.dataURLtoImage(dataURL);
  }

  async function fileToCanvas(file){
    const dataURL = await imageConversion.filetoDataURL(file);
    let image = await imageConversion.dataURLtoImage(dataURL);
    return await imageConversion.imagetoCanvas(image);
  }

  function download() {
    imageConversion.downloadFile(data.compress_file);
  }