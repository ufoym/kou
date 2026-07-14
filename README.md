# Kou

完全在浏览器本地运行的 AI 背景抠图工具。图片不会上传到服务器，处理结果可直接导出为透明 PNG。

## 技术方案

- React + Vite 静态站点，可直接部署到 GitHub Pages
- Transformers.js + Web Worker，避免推理阻塞页面
- WebGPU 优先，WASM 兼容回退
- 使用浏览器专用的 `studioludens/birefnet-lite-512` ONNX 模型。它基于 `ZhengPeng7/BiRefNet_lite`，与参考 Space 使用的 BiRefNet 属于同一模型架构
- 模型首次使用时从 Hugging Face 下载约 94 MB，之后由浏览器缓存

## 本地开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

构建结果位于 `dist/`。

## 模型与隐私

模型文件从 Hugging Face 下载到浏览器缓存；用户选择的图片只在当前浏览器标签页和推理 Worker 中处理，不会被发送到本项目的服务器。

BiRefNet 论文：*Bilateral Reference for High-Resolution Dichotomous Image Segmentation*（Zheng et al., 2024）。模型与转换权重遵循各自仓库中的许可证。
