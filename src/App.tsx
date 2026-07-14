import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  Check,
  Github,
  ImagePlus,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from 'lucide-react'

type Phase = 'idle' | 'loading' | 'processing' | 'done' | 'error'
type PreviewBackground = 'grid' | 'light' | 'dark'

const MAX_FILE_SIZE = 30 * 1024 * 1024

function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [originalUrl, setOriginalUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [backend, setBackend] = useState('')
  const [position, setPosition] = useState(50)
  const [background, setBackground] = useState<PreviewBackground>('grid')
  const inputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (event) => {
      const data = event.data
      if (data.type === 'progress') setProgress(data.progress)
      if (data.type === 'status') {
        setPhase(data.status)
        setMessage(data.message)
      }
      if (data.type === 'ready') setBackend(data.backend)
      if (data.type === 'result') {
        const blob = new Blob([data.buffer], { type: 'image/png' })
        setResultUrl((current) => {
          if (current) URL.revokeObjectURL(current)
          return URL.createObjectURL(blob)
        })
        setDimensions(`${data.width} × ${data.height}`)
        setBackend(data.backend)
        setPhase('done')
        setProgress(100)
      }
      if (data.type === 'error') {
        setPhase('error')
        setMessage('处理失败。请使用最新版 Chrome 或 Edge，并确认设备有足够内存。')
        console.error(data.message)
      }
    }
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [originalUrl, resultUrl])

  const processFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhase('error')
      setMessage('请选择 JPG、PNG 或 WebP 图片。')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setPhase('error')
      setMessage('图片不能超过 30 MB。')
      return
    }

    setFileName(file.name)
    setPosition(50)
    setProgress(0)
    setResultUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
    setOriginalUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
    setPhase('loading')
    setMessage('正在准备本地 AI 引擎')

    const buffer = await file.arrayBuffer()
    workerRef.current?.postMessage(
      { type: 'process', buffer, mime: file.type || 'image/jpeg' },
      [buffer],
    )
  }

  const reset = () => {
    setPhase('idle')
    setMessage('')
    setProgress(0)
    setFileName('')
    setDimensions('')
    setPosition(50)
    setOriginalUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
    setResultUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
    if (inputRef.current) inputRef.current.value = ''
  }

  const download = () => {
    if (!resultUrl) return
    const link = document.createElement('a')
    const base = fileName.replace(/\.[^.]+$/, '') || 'kou-result'
    link.href = resultUrl
    link.download = `${base}-transparent.png`
    link.click()
  }

  const isBusy = phase === 'loading' || phase === 'processing'

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/kou/" aria-label="Kou 首页">
          <span className="brand-mark">K</span>
          <span>Kou</span>
        </a>
        <nav aria-label="主导航">
          <a href="#how">如何使用</a>
          <a href="#privacy">隐私</a>
          <a className="github-link" href="https://github.com/ufoym/kou" target="_blank" rel="noreferrer">
            <Github size={17} /> GitHub
          </a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><Sparkles size={15} /> AI 抠图，就在你的浏览器里</div>
          <h1>一键去掉背景。<br /><span>图片无需上传。</span></h1>
          <p className="hero-copy">由 BiRefNet 驱动，在你的设备上完成所有处理。免费、无水印，也不保存任何图片。</p>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> 本地处理</span>
            <span><Zap size={17} /> WebGPU 加速</span>
            <span><Check size={17} /> 免费导出</span>
          </div>
        </section>

        <section className={`workspace ${phase === 'done' ? 'workspace-result' : ''}`} aria-live="polite">
          {phase === 'idle' || phase === 'error' ? (
            <div
              className={`dropzone ${dragging ? 'is-dragging' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false) }}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                void processFile(event.dataTransfer.files[0])
              }}
            >
              <div className="upload-icon"><ImagePlus size={34} strokeWidth={1.7} /></div>
              <h2>{phase === 'error' ? '换一张图片再试试' : '把图片拖到这里'}</h2>
              <p>或从你的设备中选择</p>
              <button className="primary-button" onClick={() => inputRef.current?.click()}>
                <Upload size={18} /> 选择图片
              </button>
              <input
                ref={inputRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void processFile(event.target.files?.[0])}
              />
              <span className="file-hint">支持 JPG、PNG、WebP · 最大 30 MB</span>
              {phase === 'error' && <div className="error-message"><X size={16} /> {message}</div>}
            </div>
          ) : isBusy ? (
            <div className="processing-panel">
              <div className="processing-preview checkerboard">
                {originalUrl && <img src={originalUrl} alt="待处理图片" />}
                <div className="scan-line" />
              </div>
              <div className="processing-copy">
                <div className="spinner"><Sparkles size={26} /></div>
                <p className="step-label">{phase === 'loading' ? '准备模型' : '正在抠图'}</p>
                <h2>{message}</h2>
                <p>{phase === 'loading' ? '模型仅在首次使用时下载，之后会保存在浏览器缓存中。' : '所有计算都在本机完成，请保持此页面打开。'}</p>
                <div className="progress-track"><span style={{ width: `${phase === 'processing' ? 100 : progress}%` }} /></div>
                <span className="progress-text">{phase === 'loading' ? `${progress}%` : 'AI 正在工作…'}</span>
              </div>
            </div>
          ) : (
            <div className="result-panel">
              <div className="result-topbar">
                <div>
                  <span className="success-pill"><Check size={14} /> 处理完成</span>
                  <h2>背景已移除</h2>
                </div>
                <button className="icon-button" onClick={reset} aria-label="关闭结果"><X size={20} /></button>
              </div>

              <div className="comparison-wrap">
                <div className={`comparison background-${background}`}>
                  <img className="result-image" src={resultUrl} alt="透明背景抠图结果" />
                  <div className="original-layer" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
                    <img src={originalUrl} alt="原始图片" />
                  </div>
                  <div className="comparison-line" style={{ left: `${position}%` }}>
                    <span className="comparison-handle">↔</span>
                  </div>
                  <input
                    className="comparison-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={position}
                    onChange={(event) => setPosition(Number(event.target.value))}
                    aria-label="拖动比较原图和抠图结果"
                  />
                  <span className="image-label label-before">原图</span>
                  <span className="image-label label-after">结果</span>
                </div>
              </div>

              <div className="result-controls">
                <div className="background-control">
                  <span>预览背景</span>
                  <div className="swatches" role="group" aria-label="预览背景">
                    {(['grid', 'light', 'dark'] as PreviewBackground[]).map((item) => (
                      <button
                        key={item}
                        className={`swatch swatch-${item} ${background === item ? 'active' : ''}`}
                        onClick={() => setBackground(item)}
                        aria-label={{ grid: '透明网格', light: '浅色背景', dark: '深色背景' }[item]}
                      />
                    ))}
                  </div>
                </div>
                <div className="result-meta">
                  <span>{dimensions}</span>
                  <span>{backend}</span>
                  <span>PNG</span>
                </div>
                <button className="secondary-button" onClick={reset}><RefreshCw size={17} /> 换一张</button>
                <button className="primary-button download-button" onClick={download}><ArrowDownToLine size={18} /> 下载透明 PNG</button>
              </div>
            </div>
          )}
        </section>

        <section className="how-section" id="how">
          <div className="section-kicker">简单三步</div>
          <h2>从照片到透明素材，只需几秒</h2>
          <div className="steps">
            <article><span>01</span><Upload size={24} /><h3>选择图片</h3><p>拖入照片，或从设备中选择 JPG、PNG、WebP 文件。</p></article>
            <article><span>02</span><Sparkles size={24} /><h3>本地抠图</h3><p>BiRefNet 在浏览器中识别主体、发丝和复杂边缘。</p></article>
            <article><span>03</span><ArrowDownToLine size={24} /><h3>下载结果</h3><p>预览前后效果，免费导出高清透明 PNG。</p></article>
          </div>
        </section>

        <section className="privacy-section" id="privacy">
          <div className="privacy-icon"><LockKeyhole size={28} /></div>
          <div><div className="section-kicker">隐私优先</div><h2>你的图片，只属于你。</h2></div>
          <p>没有上传，没有服务器，也没有账号。浏览器直接读取图片并运行 AI 模型；关闭页面后，图片不会留在任何远端系统中。</p>
        </section>
      </main>

      <footer>
        <div className="brand"><span className="brand-mark">K</span><span>Kou</span></div>
        <p>基于开源 BiRefNet · 完全在浏览器中运行</p>
        <a href="https://github.com/ufoym/kou" target="_blank" rel="noreferrer"><Github size={17} /> 查看源码</a>
      </footer>
    </div>
  )
}

export default App
