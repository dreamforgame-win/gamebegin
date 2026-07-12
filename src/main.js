import { AD_CONFIG } from './ads.js';

globalThis.__AI_TOOL_AD_CONFIG = AD_CONFIG;

async function loadApplication() {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器版本过旧，请升级后再使用。');
  }

  const archiveUrl = new URL(`${import.meta.env.BASE_URL}main.js.gz.b64`, window.location.href);
  const response = await fetch(archiveUrl);
  if (!response.ok) throw new Error('应用资源加载失败，请刷新页面重试。');

  const base64 = (await response.text()).trim();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const decompressed = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  let source = await new Response(decompressed).text();

  source = source
    .replace('import"./styles.css";', '')
    .replace('from"jszip"', 'from"https://esm.sh/jszip@3.10.1"')
    .replace('from"upng-js"', 'from"https://esm.sh/upng-js@2.1.0"')
    .replace('from"gifuct-js"', 'from"https://esm.sh/gifuct-js@2.1.2"')
    .replace('import{AD_CONFIG as te}from"./ads.js";', 'const te=globalThis.__AI_TOOL_AD_CONFIG;');

  const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try {
    await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

loadApplication().catch((error) => {
  console.error(error);
  document.querySelector('#app').innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#07111f;color:#f6f9ff;font-family:system-ui,sans-serif">
      <section style="max-width:520px;padding:28px;border:1px solid rgba(151,181,220,.22);border-radius:18px;background:#0e1c30;text-align:center">
        <h1 style="margin:0 0 12px;font-size:22px">应用加载失败</h1>
        <p style="margin:0;color:#9db0c8;line-height:1.7">${error.message}</p>
      </section>
    </main>`;
});
