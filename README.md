# Kou

An AI-powered background removal tool that runs entirely in your browser. Images are never uploaded to a server, and results can be exported directly as transparent PNG files.

## How It Works

- Built as a static React and Vite site that can be deployed directly to GitHub Pages
- Runs inference with Transformers.js in a Web Worker to keep the interface responsive
- Uses WebGPU when available, with a WASM fallback for compatibility
- Uses the browser-optimized `studioludens/birefnet-lite-512` ONNX model, based on `ZhengPeng7/BiRefNet_lite` and the same BiRefNet architecture as the reference Space
- Downloads approximately 94 MB of model files from Hugging Face on first use, then stores them in the browser cache

## Local Development

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

The generated files are written to `dist/`.

## Model and Privacy

Model files are downloaded from Hugging Face and stored in the browser cache. Images selected by the user are processed only in the current browser tab and its inference worker; they are not sent to this project's server.

BiRefNet is described in *Bilateral Reference for High-Resolution Dichotomous Image Segmentation* (Zheng et al., 2024). The model and converted weights remain subject to the licenses in their respective repositories.

## License

Kou is released under the [MIT License](LICENSE).
