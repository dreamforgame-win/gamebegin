# AI 开发工具箱

一个纯前端、本地处理的图片工具站。用户图片不会上传服务器，适合部署到 Vercel、GitHub Pages 或任意静态托管平台。

## 已实现功能

- 双背景抠图：使用同一主体的黑底图与白底图恢复透明通道
- 图片放大与尺寸调整
- PNG 压缩
- 图标批量切图
- Sprite 序列帧拆分与动画预览
- GIF 拆帧并导出 PNG 压缩包
- 九宫格切图
- Banner 尺寸生成
- 微信常用素材尺寸转换

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 广告接入

项目已预留广告配置。编辑 `src/ads.js`：

1. 将 `enabled` 改为 `true`。
2. 填写 AdSense 的 `client` 与广告位 `slot`。
3. 在 `index.html` 中加入平台提供的广告脚本。

默认关闭广告；访问地址追加 `?ads=preview` 可预览广告位布局。

## 隐私

除广告脚本可能产生的网络请求外，所有图片读取、处理和导出都在浏览器本地完成。
