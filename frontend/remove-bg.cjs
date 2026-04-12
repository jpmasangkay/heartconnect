const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const logosDir = path.join(__dirname, 'public', 'logos');
const files = fs.readdirSync(logosDir).filter(f => f.match(/\.(jpg|jpeg)$/i));

async function processImages() {
  for (const file of files) {
    const inputPath = path.join(logosDir, file);
    const outputPath = path.join(logosDir, file.replace(/\.(jpg|jpeg)$/i, '.png'));
    
    try {
      const image = await Jimp.read(inputPath);
      
      // We will look at the border pixels to guess the background color.
      // Usually it's either white or black.
      let isBlackBg = false;
      let isWhiteBg = false;
      
      const topLeft = image.getPixelColor(0, 0);
      const {r, g, b} = Jimp.intToRGBA(topLeft);
      if (r < 50 && g < 50 && b < 50) isBlackBg = true;
      if (r > 200 && g > 200 && b > 200) isWhiteBg = true;

      // Tolerance for compression artifacts
      const thresholdBlack = 50;
      const thresholdWhite = 220;

      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const red = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];
        const alpha = this.bitmap.data[idx + 3];

        if (isBlackBg) {
          if (red < thresholdBlack && green < thresholdBlack && blue < thresholdBlack) {
            this.bitmap.data[idx + 3] = 0; // completely transparent
          } else if (red < thresholdBlack + 30 && green < thresholdBlack + 30 && blue < thresholdBlack + 30) {
            // Anti-aliasing edge softening
            this.bitmap.data[idx + 3] = (red + green + blue) / 3;
          }
        } else if (isWhiteBg) {
          if (red > thresholdWhite && green > thresholdWhite && blue > thresholdWhite) {
            this.bitmap.data[idx + 3] = 0;
          } else if (red > thresholdWhite - 30 && green > thresholdWhite - 30 && blue > thresholdWhite - 30) {
             this.bitmap.data[idx + 3] = 255 - ((255 - red + 255 - green + 255 - blue) / 3);
          }
        }
      });

      await image.writeAsync(outputPath);
      console.log(`Processed ${file} -> ${path.basename(outputPath)}`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
}

processImages();
