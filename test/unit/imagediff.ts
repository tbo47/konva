import { createCanvas, Canvas } from 'canvas';

var TYPE_ARRAY = /\[object Array\]/i,
  TYPE_CANVAS = /\[object (Canvas|HTMLCanvasElement)\]/i,
  TYPE_NODE_CANVAS = /\[object (Canvas|HTMLCanvasElement)\]/i,
  TYPE_CONTEXT = /\[object CanvasRenderingContext2D\]/i,
  TYPE_IMAGE = /\[object (Image|HTMLImageElement)\]/i,
  TYPE_IMAGE_DATA = /\[object ImageData\]/i,
  UNDEFINED = 'undefined',
  canvas = getCanvas(),
  context = canvas.getContext('2d');

// Creation
function getCanvas(width?, height?) {
  return createCanvas(width, height);
}
function getImageData(width, height) {
  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  return context.createImageData(width, height);
}

// Type Checking
function isImage(object) {
  return isType(object, TYPE_IMAGE);
}
function isCanvas(object) {
  return isType(object, TYPE_CANVAS) || object instanceof Canvas;
}
function isContext(object) {
  return isType(object, TYPE_CONTEXT);
}
function isImageData(object) {
  return !!(
    object &&
    isType(object, TYPE_IMAGE_DATA) &&
    typeof object.width !== UNDEFINED &&
    typeof object.height !== UNDEFINED &&
    typeof object.data !== UNDEFINED
  );
}
function isImageType(object) {
  return (
    isImage(object) ||
    isCanvas(object) ||
    isContext(object) ||
    isImageData(object)
  );
}
function isType(object, type) {
  return (
    typeof object === 'object' &&
    !!Object.prototype.toString.apply(object).match(type)
  );
}

// Type Conversion
function copyImageData(imageData) {
  const height = imageData.height,
    width = imageData.width,
    data = imageData.data;

  canvas.width = width;
  canvas.height = height;
  const newImageData = context.getImageData(0, 0, width, height);
  const newData = newImageData.data;

  for (let i = imageData.data.length; i--; ) {
    newData[i] = data[i];
  }

  return newImageData;
}
function toImageData(object) {
  if (isImage(object)) {
    return toImageDataFromImage(object);
  }
  if (isCanvas(object)) {
    return toImageDataFromCanvas(object);
  }
  if (isContext(object)) {
    return toImageDataFromContext(object);
  }
  if (isImageData(object)) {
    return object;
  }
}
function toImageDataFromImage(image) {
  const height = image.height,
    width = image.width;
  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, width, height);
}
function toImageDataFromCanvas(canvas) {
  const height = canvas.height,
    width = canvas.width,
    context = canvas.getContext('2d');
  if (!width || !height) {
    console.trace(width, height);
  }

  return context.getImageData(0, 0, width, height);
}
function toImageDataFromContext(context) {
  const canvas = context.canvas,
    height = canvas.height,
    width = canvas.width;
  return context.getImageData(0, 0, width, height);
}
function toCanvas(object) {
  const data = toImageData(object),
    canvas = getCanvas(data.width, data.height),
    context = canvas.getContext('2d');

  context.putImageData(data, 0, 0);
  return canvas;
}

// ImageData Equality Operators
function equalWidth(a, b) {
  return a.width === b.width;
}
function equalHeight(a, b) {
  return a.height === b.height;
}
function equalDimensions(a, b) {
  return equalHeight(a, b) && equalWidth(a, b);
}

export function equal(a, b, tolerance, secondTol) {
  const aData = a.data,
    bData = b.data,
    length = aData.length;

  tolerance = tolerance || 0;

  let count = 0;
  if (!equalDimensions(a, b)) return false;
  for (let i = length; i--; ) {
    const d = Math.abs(aData[i] - bData[i]);
    if (aData[i] !== bData[i] && d > tolerance) {
      if (!secondTol) {
        console.log('Diff', d);
        return false;
      } else {
        count += 1;
      }
      if (count > secondTol) {
        console.log('Diff', d, count);
        return false;
      }
    }
  }

  return true;
}

// Diff
function diff(a, b, options) {
  return (equalDimensions(a, b) ? diffEqual : diffUnequal)(a, b, options);
}
function diffEqual(a, b, options) {
  const height = a.height,
    width = a.width,
    c = getImageData(width, height), // c = a - b
    aData = a.data,
    bData = b.data,
    cData = c.data,
    length = cData.length;

  for (let i = 0; i < length; i += 4) {
    cData[i] = Math.abs(aData[i] - bData[i]);
    cData[i + 1] = Math.abs(aData[i + 1] - bData[i + 1]);
    cData[i + 2] = Math.abs(aData[i + 2] - bData[i + 2]);
    cData[i + 3] = Math.abs(255 - Math.abs(aData[i + 3] - bData[i + 3]));
  }

  return c;
}
function diffUnequal(a, b, options) {
  const height = Math.max(a.height, b.height),
    width = Math.max(a.width, b.width),
    c = getImageData(width, height), // c = a - b
    aData = a.data,
    bData = b.data,
    cData = c.data,
    align = options && options.align;
  var rowOffset,
    columnOffset;

  for (let i = cData.length - 1; i > 0; i = i - 4) {
    cData[i] = 255;
  }

  // Add First Image
  offsets(a);
  for (let row = a.height; row--; ) {
    for (let column = a.width; column--; ) {
      const i = 4 * ((row + rowOffset) * width + (column + columnOffset));
      const j = 4 * (row * a.width + column);
      cData[i + 0] = aData[j + 0]; // r
      cData[i + 1] = aData[j + 1]; // g
      cData[i + 2] = aData[j + 2]; // b
      // cData[i+3] = aData[j+3]; // a
    }
  }

  // Subtract Second Image
  offsets(b);
  for (let row = b.height; row--; ) {
    for (let column = b.width; column--; ) {
      const i = 4 * ((row + rowOffset) * width + (column + columnOffset));
      const j = 4 * (row * b.width + column);
      cData[i + 0] = Math.abs(cData[i + 0] - bData[j + 0]); // r
      cData[i + 1] = Math.abs(cData[i + 1] - bData[j + 1]); // g
      cData[i + 2] = Math.abs(cData[i + 2] - bData[j + 2]); // b
    }
  }

  // Helpers
  function offsets(imageData) {
    if (align === 'top') {
      rowOffset = 0;
      columnOffset = 0;
    } else {
      rowOffset = Math.floor((height - imageData.height) / 2);
      columnOffset = Math.floor((width - imageData.width) / 2);
    }
  }

  return c;
}

// Validation
function checkType(...args) {
  for (let i = 0; i < args.length; i++) {
    if (!isImageType(args[i])) {
      throw {
        name: 'ImageTypeError',
        message: 'Submitted object was not an image.',
      };
    }
  }
}

// function formatImageDiffEqualHtmlReport(actual, expected) {
//   var div = get('div', '<span>Expected to be equal.'),
//     a = get('div', '<div>Actual:</div>'),
//     b = get('div', '<div>Expected:</div>'),
//     c = get('div', '<div>Diff:</div>'),
//     diff = imagediff.diff(actual, expected),
//     canvas = getCanvas(),
//     context;

//   canvas.height = diff.height;
//   canvas.width = diff.width;

//   div.style.overflow = 'hidden';
//   a.style.float = 'left';
//   b.style.float = 'left';
//   c.style.float = 'left';

//   context = canvas.getContext('2d');
//   context.putImageData(diff, 0, 0);

//   a.appendChild(toCanvas(actual));
//   b.appendChild(toCanvas(expected));
//   c.appendChild(canvas);

//   div.appendChild(a);
//   div.appendChild(b);
//   div.appendChild(c);

//   return div.innerHTML;
// }

// function formatImageDiffEqualTextReport(actual, expected) {
//   return 'Expected to be equal.';
// }

export const imagediff = {
  createCanvas: getCanvas,
  createImageData: getImageData,

  isImage: isImage,
  isCanvas: isCanvas,
  isContext: isContext,
  isImageData: isImageData,
  isImageType: isImageType,

  toImageData: function (object) {
    checkType(object);
    if (isImageData(object)) {
      return copyImageData(object);
    }
    return toImageData(object);
  },

  equal: function (a, b, tolerance, secondTol) {
    checkType(a, b);
    a = toImageData(a);
    b = toImageData(b);
    return equal(a, b, tolerance, secondTol);
  },
  diff: function (a, b, options?) {
    checkType(a, b);
    a = toImageData(a);
    b = toImageData(b);
    return diff(a, b, options);
  },
};
