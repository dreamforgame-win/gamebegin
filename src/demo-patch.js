const DEMO_ASSETS = {
  white: new URL('/demo-white.jpg', window.location.origin).href,
  black: new URL('/demo-black.jpg', window.location.origin).href
};

const handledInputs = new WeakSet();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchDemoFile(url, name) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`示例图片请求失败：${response.status}`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('示例资源不是有效图片');
  }
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

function setInputFile(input, file) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function waitUntilEnabled(button, timeout = 5000) {
  const started = Date.now();
  while (button.disabled && Date.now() - started < timeout) {
    await wait(80);
  }
  return !button.disabled;
}

async function restoreDemoImages() {
  const whiteInput = document.querySelector('.white-zone input[type="file"]');
  const blackInput = document.querySelector('.black-zone input[type="file"]');
  if (!whiteInput || !blackInput || handledInputs.has(whiteInput)) return;

  handledInputs.add(whiteInput);
  handledInputs.add(blackInput);

  await wait(1200);

  const whiteZone = whiteInput.closest('.white-zone');
  const blackZone = blackInput.closest('.black-zone');
  if (whiteZone?.querySelector('.dropzone-preview') && blackZone?.querySelector('.dropzone-preview')) {
    return;
  }

  const status = document.querySelector('.status-line');
  try {
    status && (status.textContent = '正在从 GitHub 同步水杯示例图片…');
    const [whiteFile, blackFile] = await Promise.all([
      fetchDemoFile(DEMO_ASSETS.white, 'water-cup-white.jpg'),
      fetchDemoFile(DEMO_ASSETS.black, 'water-cup-black.jpg')
    ]);

    setInputFile(whiteInput, whiteFile);
    setInputFile(blackInput, blackFile);

    const processButton = document.querySelector('.process');
    if (processButton && await waitUntilEnabled(processButton)) {
      processButton.click();
    }
  } catch (error) {
    console.error('默认示例加载失败', error);
    if (status) {
      status.textContent = '示例图片加载失败，请手动上传';
      status.style.color = 'var(--danger)';
    }
  }
}

const observer = new MutationObserver(() => {
  restoreDemoImages();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
restoreDemoImages();
