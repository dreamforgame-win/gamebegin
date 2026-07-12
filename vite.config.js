import { defineConfig } from 'vite';

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

const mattingPrompt = `请帮我制作一个可以直接运行的“双背景抠图”网页工具。只制作这个抠图工具，不要增加图片压缩、放大、切图等其他功能。

一、实现方式
1. 使用纯前端 HTML、CSS 和 JavaScript 实现，不需要服务器，不上传用户图片。
2. 优先整合为一个完整的 index.html 文件，保存后双击即可运行。
3. 页面使用中文，兼容电脑端和手机端，界面简洁、清晰、适合普通用户。
4. 请直接输出完整可运行代码，不要只给思路、伪代码或省略关键实现。

二、上传区域
1. 提供两个独立的图片上传区域：白色背景图和黑色背景图。
2. 支持点击选择文件和拖拽上传。
3. 上传后显示缩略图和文件名。
4. 两张图必须尺寸一致；尺寸不同则明确提示并禁止处理。
5. 提供“交换图片”和“重新上传”按钮。
6. 不要预置或嵌入任何示例图片，由用户自行上传。

三、双背景透明通道算法
1. 不能使用简单的删除白色、删除黑色、颜色阈值抠图，也不能调用在线抠图接口。
2. 必须根据同一前景分别合成在纯白背景和纯黑背景上的像素关系恢复 Alpha 通道。
3. 对每个像素，设白底图 RGB 为 W，黑底图 RGB 为 B。根据 W = αF + (1-α)×255、B = αF 计算透明度和前景颜色。
4. 对 RGB 三个通道分别计算 αc = 1 - (Wc - Bc) / 255，并使用中位数或稳健平均值合成最终 Alpha，限制在 0～1 范围内。
5. Alpha 接近 0 时直接输出完全透明像素，避免除以零。
6. 前景颜色分别从黑底结果 Fc1 = Bc / α，以及白底结果 Fc2 = (Wc - (1-α)×255) / α 反推；默认对两者取平均并限制到 0～255，以减少误差。
7. 输出必须保留玻璃、水、烟雾、光效、毛发和柔和边缘等半透明信息。
8. 为大图片分块处理，并在分块之间使用 requestAnimationFrame 让出主线程，避免页面长时间卡死。

四、处理设置
1. 增加“透明边缘清理”滑杆，范围为 0%～8%，默认 1%。
2. 增加“同时使用黑底与白底结果校正前景颜色”复选框，默认开启。
3. 显示处理进度、当前状态、原图尺寸和错误提示。

五、输入校验
1. 检查两张图是否可能上传反了：白底图四角应接近白色，黑底图四角应接近黑色。
2. 检查是否重复上传了同一张或几乎相同的图片。
3. 校验失败时停止处理，并用普通用户能理解的中文说明原因。
4. 所有异常都要捕获，不能让页面直接报错或失去响应。

六、结果预览与导出
1. 处理完成后显示透明 PNG 预览。
2. 预览支持棋盘格、深色、浅色三种背景切换，以检查透明边缘。
3. 提供“导出透明 PNG”按钮。
4. 导出图片必须保持原始宽高和清晰度，不改变比例，不压缩尺寸，并保留完整 Alpha 通道。
5. 文件处理、像素计算和导出必须全部在浏览器本地完成。

七、界面要求
1. 页面顶部显示标题“双背景抠图”和一句简短说明。
2. 左侧或上方是上传与设置区，右侧或下方是结果预览区；移动端自动改为单列。
3. 主要按钮包括：开始生成透明 PNG、交换图片、重新上传、导出透明 PNG。
4. 页面明确显示“图片仅在本地处理，不会上传服务器”。
5. 使用深色现代化界面，按钮、上传框、进度条、弹窗和错误状态风格统一。

完成后请自行检查：上传与拖拽是否正常、两张图尺寸不一致时是否阻止处理、背景放反时是否提示、半透明区域是否保留、导出的 PNG 是否真的带透明通道、手机端是否可以正常操作。`;

const toolHeadFunction = [
  'function F(e,n){return`<div class="tool-head">',
  '    <div class="tool-title-wrap"><div class="tool-kicker">${e.kicker}</div><h2>${e.title}</h2><p>${n}</p></div>',
  '    <div class="tool-head-actions">',
  '      ${e.id==="matting"?\'<button class="btn ai-prompt-btn" type="button">AI提示词复制</button>\':""}',
  '      <div class="local-chip"><span style="width:17px;height:17px;display:inline-block">${Se}</span>仅在本地处理</div>',
  '    </div>',
  '  </div>`}function _'
].join('\n');

const promptModalHelper = `const AI_MATTING_PROMPT=${JSON.stringify(mattingPrompt)};
function copyAiPromptText(text){
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);
  return new Promise((resolve,reject)=>{
    const area=document.createElement("textarea");
    area.value=text;
    area.setAttribute("readonly","");
    area.style.position="fixed";
    area.style.opacity="0";
    document.body.appendChild(area);
    area.select();
    try{document.execCommand("copy")?resolve():reject(new Error("复制失败"))}catch(error){reject(error)}finally{area.remove()}
  });
}
function setupAiPromptModal(root){
  const trigger=root.querySelector(".ai-prompt-btn");
  if(!trigger)return;
  let modal=document.querySelector(".ai-prompt-modal");
  if(!modal){
    modal=document.createElement("div");
    modal.className="ai-prompt-modal";
    modal.setAttribute("aria-hidden","true");
    modal.innerHTML='<section class="ai-prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-prompt-title"><header class="ai-prompt-header"><button class="btn blue ai-prompt-copy" type="button">复制提示词</button><h3 id="ai-prompt-title">双背景抠图工具生成提示词</h3><button class="ai-prompt-close" type="button" aria-label="关闭弹窗">×</button></header><div class="ai-prompt-body"><p class="ai-prompt-intro">复制下面的完整提示词发送给支持代码生成的 AI，即可让 AI 还原一个独立的双背景抠图网页工具。</p><pre class="ai-prompt-content" tabindex="0"></pre></div></section>';
    modal.querySelector(".ai-prompt-content").textContent=AI_MATTING_PROMPT;
    document.body.appendChild(modal);
  }
  const close=()=>{modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open")};
  const open=()=>{modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");setTimeout(()=>modal.querySelector(".ai-prompt-copy")?.focus(),0)};
  trigger.addEventListener("click",open);
  modal.querySelector(".ai-prompt-close").onclick=close;
  modal.onclick=event=>{if(event.target===modal)close()};
  modal.querySelector(".ai-prompt-copy").onclick=async()=>{
    try{await copyAiPromptText(AI_MATTING_PROMPT);f("提示词已复制")}
    catch(error){console.error(error);f("复制失败，请手动选择文本复制","error")}
  };
  if(!modal.dataset.escapeBound){
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&modal.classList.contains("open"))close()});
    modal.dataset.escapeBound="1";
  }
}`;

function cleanHomepageAndMatting() {
  return {
    name: 'clean-homepage-and-matting',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/main.js')) return null;

      let patched = code
        .replace(/\s*<section class="hero">[\s\S]*?<\/section>/, '')
        .replace(
          /async function loadDemoFile[\s\S]*?\);const o=e\.querySelector\("\.edge-clean"\)/,
          'const o=e.querySelector(".edge-clean")'
        )
        .replace(/function F\(e,n\)\{return`[\s\S]*?`\}function _/, toolHeadFunction)
        .replace('function ze(e){', `${validationHelper}${promptModalHelper}function ze(e){`)
        .replace('    </div>`;const t=T.matting=', '    </div>`;setupAiPromptModal(e);const t=T.matting=')
        .replace(pixelReadMarker, guardedPixelRead);

      const failed = [
        patched.includes('<section class="hero">'),
        patched.includes('loadDemoFile'),
        patched.includes('demo-white'),
        patched.includes('demo-black'),
        !patched.includes('validateMattingPair(m,h,l,c)'),
        !patched.includes('AI提示词复制'),
        !patched.includes('setupAiPromptModal(e);const t=T.matting=')
      ].some(Boolean);

      if (failed) {
        throw new Error('Homepage/matting enhancement patch did not apply.');
      }

      return { code: patched, map: null };
    },
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'chunk') continue;
        asset.code = asset.code.replace(
          /const\s+[$\w]+=\{white:new URL\("\/demo-white\.jpg"[\s\S]*$/,
          ''
        );
        if (/demo-(white|black)\.jpg/.test(asset.code)) {
          throw new Error('Default demo image loader still exists in production bundle.');
        }
      }
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: 'bootstrap',
  plugins: [cleanHomepageAndMatting()]
});
