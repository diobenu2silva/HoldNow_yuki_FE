import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';

let model: nsfwjs.NSFWJS | null = null;

export async function loadNSFWModel() {
  if (!model) {
    model = await nsfwjs.load();
  }
  return model;
}

export async function isImageNSFW(imageUrl: string): Promise<boolean> {
  await loadNSFWModel();

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = async () => {
      if (!model) return resolve(false);
      const predictions = await model.classify(img);
      // You can adjust the threshold and which classes you consider NSFW
      const nsfwScore = predictions
        .filter(p => p.className !== 'Neutral' && p.className !== 'Drawing')
        .reduce((sum, p) => sum + p.probability, 0);
      resolve(nsfwScore > 0.5); // Adjust threshold as needed
    };
    img.onerror = () => resolve(false);
  });
} 