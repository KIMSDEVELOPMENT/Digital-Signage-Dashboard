export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
    image.src = url
  })

/**
 * This function was adapted from the one in the ReadMe of https://github.com/DominicTobias/react-image-crop
 * @param {File} imageSrc - Image File url
 * @param {Object} pixelCrop - pixelCrop Object provided by react-easy-crop
 */
export default async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  // Max dimensions for the exported photo
  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 800;

  let finalWidth = pixelCrop.width;
  let finalHeight = pixelCrop.height;

  // Scale down if larger than MAX_WIDTH or MAX_HEIGHT
  if (finalWidth > MAX_WIDTH || finalHeight > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / finalWidth, MAX_HEIGHT / finalHeight);
    finalWidth = Math.round(finalWidth * ratio);
    finalHeight = Math.round(finalHeight * ratio);
  }

  // set canvas size to the final scaled dimensions
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // draw image directly scaled to final dimensions
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    finalWidth,
    finalHeight
  )

  // Export as blob with 0.85 JPEG compression quality to drastically reduce size
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file)
    }, 'image/jpeg', 0.85)
  })
}
