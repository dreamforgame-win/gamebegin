import { defineConfig } from 'vite';

const oldDemoDecoder = 'const p=(await v.text()).trim(),m=atob(p),h=new Uint8Array(m.length);for(let L=0;L<m.length;L++)h[L]=m.charCodeAt(L);return new File([h],c,{type:"image/jpeg"})';
const newDemoDecoder = 'const p=await v.blob();return new File([p],c,{type:p.type||"image/jpeg"})';

const pixelReadMarker = 'const m=v.getContext("2d",{willReadFrequently:!0}).getImageData(0,0,l,c).data,h=p.getContext("2d",{willReadFrequently:!0}).getImageData(0,0,l,c).data,L=S(l,c)';
const guardedPixelRead = 'const m=v.getContext("2d",{willReadFrequently:!0}).getImageData(0,0,l,c).data,h=p.getContext("2d",{willReadFrequently:!0}).getImageData(0,0,l,c).data;validateMattingPair(m,h,l,c);const L=S(l,c)';

const validationHelper = `function validateMattingPair(whitePixels,blackPixels,width,height){
  const corners=[0,(width-1)*4,(height-1)*width*4,(width*height-1)*4];
  let whiteCorner=0,blackCorner=0;
  for(const index of corners){
    whiteCorner+=whitePixels[index]+whitePixels[index+1]+whitePixels[index+2];
    blackCorner+=blackPixels[index]+blackPixels[index+1]+blackPixels[index+2];
  }
  whiteCorner/=corners.length*3;
  blackCorner/=corners.length*3;
  if(whiteCorner<205||blackCorner>50){
    throw new Error("背景校验失败：请确认白底图与黑底图没有放反，并且四角为纯白/纯黑背景");
  }
  const pixelCount=width*height;
  const step=Math.max(1,Math.floor(pixelCount/4096));
  let difference=0,samples=0;
  for(let pixel=0;pixel<pixelCount;pixel+=step){
    const index=pixel*4;
    difference+=Math.abs(whitePixels[index]-blackPixels[index])+Math.abs(whitePixels[index+1]-blackPixels[index+1])+Math.abs(whitePixels[index+2]-blackPixels[index+2]);
    samples+=3;
  }
  if(difference/Math.max(1,samples)<2){
    throw new Error("两张图片几乎相同，请检查是否重复上传了同一张图片");
  }
}`;

function patchMattingDemo() {
  return {
    name: 'patch-matting-demo',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/main.js')) return null;

      let patched = code
        .replaceAll('./demo-white.jpg.b64', './demo-white.jpg?v=3')
        .replaceAll('./demo-black.jpg.b64', './demo-black.jpg?v=3')
        .replace('fetch(new URL(l,window.location.href))', 'fetch(new URL(l,window.location.href),{cache:"no-store"})')
        .replace(oldDemoDecoder, newDemoDecoder)
        .replace('function ze(e){', `${validationHelper}function ze(e){`)
        .replace(pixelReadMarker, guardedPixelRead);

      const failed = [
        patched.includes('.jpg.b64'),
        patched.includes(oldDemoDecoder),
        !patched.includes('validateMattingPair(m,h,l,c)')
      ].some(Boolean);

      if (failed) {
        throw new Error('Double-background matting source patch did not apply.');
      }

      return { code: patched, map: null };
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: 'bootstrap',
  plugins: [patchMattingDemo()]
});
