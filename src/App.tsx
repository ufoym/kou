import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine, Check, ChevronDown, Github, Globe2, ImagePlus, LockKeyhole,
  RefreshCw, ShieldCheck, Sparkles, Upload, X, Zap,
} from 'lucide-react'
import { getInitialLocale, localeNames, locales, translate, type Locale, type TranslationKey } from './i18n'

type Phase = 'idle' | 'loading' | 'processing' | 'done' | 'error'
type PreviewBackground = 'grid' | 'light' | 'dark'

const MAX_FILE_SIZE = 30 * 1024 * 1024

function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const [phase, setPhase] = useState<Phase>('idle')
  const [dragging, setDragging] = useState(false)
  const [messageKey, setMessageKey] = useState<TranslationKey>('preparingLocal')
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
  const t = (key: TranslationKey) => translate(locale, key)

  useEffect(() => {
    localStorage.setItem('kou-locale', locale)
    document.documentElement.lang = locale
    document.title = t('metaTitle')
    const setMeta = (selector: string, content: string) => document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content)
    setMeta('meta[name="description"]', t('metaDescription'))
    setMeta('meta[property="og:title"]', t('metaTitle'))
    setMeta('meta[property="og:description"]', t('ogDescription'))
  }, [locale])

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (event) => {
      const data = event.data
      if (data.type === 'progress') setProgress(data.progress)
      if (data.type === 'status') {
        setPhase(data.status)
        setMessageKey(data.messageKey)
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
        setMessageKey('genericError')
        console.error(data.message)
      }
    }
    return () => worker.terminate()
  }, [])

  useEffect(() => () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
  }, [originalUrl, resultUrl])

  const processFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhase('error')
      setMessageKey('invalidType')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setPhase('error')
      setMessageKey('tooLarge')
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
    setMessageKey('preparingLocal')

    const buffer = await file.arrayBuffer()
    workerRef.current?.postMessage({ type: 'process', buffer, mime: file.type || 'image/jpeg' }, [buffer])
  }

  const reset = () => {
    setPhase('idle')
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
  const backgroundLabels: Record<PreviewBackground, TranslationKey> = {
    grid: 'transparentGrid', light: 'lightBackground', dark: 'darkBackground',
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/kou/" aria-label={t('home')}>
          <span className="brand-mark">K</span><span>Kou</span>
        </a>
        <nav aria-label={t('nav')}>
          <a href="#how">{t('howNav')}</a>
          <a href="#privacy">{t('privacyNav')}</a>
          <div className="language-select">
            <Globe2 size={16} aria-hidden="true" />
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t('language')}>
              {locales.map((item) => <option key={item} value={item}>{localeNames[item]}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
          <a className="github-link" href="https://github.com/ufoym/kou" target="_blank" rel="noreferrer">
            <Github size={17} /> <span>GitHub</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><Sparkles size={15} /> {t('eyebrow')}</div>
          <h1>{t('hero1')}<br /><span>{t('hero2')}</span></h1>
          <p className="hero-copy">{t('heroCopy')}</p>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> {t('localProcessing')}</span>
            <span><Zap size={17} /> {t('webgpu')}</span>
            <span><Check size={17} /> {t('freeExport')}</span>
          </div>
        </section>

        <section className={`workspace ${phase === 'done' ? 'workspace-result' : ''}`} aria-live="polite">
          {phase === 'idle' || phase === 'error' ? (
            <div
              className={`dropzone ${dragging ? 'is-dragging' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false) }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void processFile(event.dataTransfer.files[0]) }}
            >
              <div className="upload-icon"><ImagePlus size={34} strokeWidth={1.7} /></div>
              <h2>{phase === 'error' ? t('tryAnother') : t('dropHere')}</h2>
              <p>{t('chooseFromDevice')}</p>
              <button className="primary-button" onClick={() => inputRef.current?.click()}>
                <Upload size={18} /> {t('chooseImage')}
              </button>
              <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(event) => void processFile(event.target.files?.[0])} />
              <span className="file-hint">{t('fileHint')}</span>
              {phase === 'error' && <div className="error-message"><X size={16} /> {t(messageKey)}</div>}
            </div>
          ) : isBusy ? (
            <div className="processing-panel">
              <div className="processing-preview checkerboard">
                {originalUrl && <img src={originalUrl} alt={t('pendingAlt')} />}
                <div className="scan-line" />
              </div>
              <div className="processing-copy">
                <div className="spinner"><Sparkles size={26} /></div>
                <p className="step-label">{phase === 'loading' ? t('prepareModel') : t('removingBackground')}</p>
                <h2>{t(messageKey)}</h2>
                <p>{phase === 'loading' ? t('firstDownload') : t('keepOpen')}</p>
                <div className="progress-track"><span style={{ width: `${phase === 'processing' ? 100 : progress}%` }} /></div>
                <span className="progress-text">{phase === 'loading' ? `${progress}%` : t('aiWorking')}</span>
              </div>
            </div>
          ) : (
            <div className="result-panel">
              <div className="result-topbar">
                <div><span className="success-pill"><Check size={14} /> {t('complete')}</span><h2>{t('removed')}</h2></div>
                <button className="icon-button" onClick={reset} aria-label={t('closeResult')}><X size={20} /></button>
              </div>
              <div className="comparison-wrap">
                <div className={`comparison background-${background}`}>
                  <img className="result-image" src={resultUrl} alt={t('resultAlt')} />
                  <div className="original-layer" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
                    <img src={originalUrl} alt={t('originalAlt')} />
                  </div>
                  <div className="comparison-line" style={{ left: `${position}%` }}><span className="comparison-handle">↔</span></div>
                  <input className="comparison-slider" type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} aria-label={t('compareLabel')} />
                  <span className="image-label label-before">{t('before')}</span><span className="image-label label-after">{t('after')}</span>
                </div>
              </div>
              <div className="result-controls">
                <div className="background-control">
                  <span>{t('previewBackground')}</span>
                  <div className="swatches" role="group" aria-label={t('previewBackground')}>
                    {(['grid', 'light', 'dark'] as PreviewBackground[]).map((item) => (
                      <button key={item} className={`swatch swatch-${item} ${background === item ? 'active' : ''}`} onClick={() => setBackground(item)} aria-label={t(backgroundLabels[item])} />
                    ))}
                  </div>
                </div>
                <div className="result-meta"><span>{dimensions}</span><span>{backend}</span><span>PNG</span></div>
                <button className="secondary-button" onClick={reset}><RefreshCw size={17} /> {t('another')}</button>
                <button className="primary-button download-button" onClick={download}><ArrowDownToLine size={18} /> {t('download')}</button>
              </div>
            </div>
          )}
        </section>

        <section className="how-section" id="how">
          <div className="section-kicker">{t('threeSteps')}</div><h2>{t('seconds')}</h2>
          <div className="steps">
            <article><span>01</span><Upload size={24} /><h3>{t('step1Title')}</h3><p>{t('step1Copy')}</p></article>
            <article><span>02</span><Sparkles size={24} /><h3>{t('step2Title')}</h3><p>{t('step2Copy')}</p></article>
            <article><span>03</span><ArrowDownToLine size={24} /><h3>{t('step3Title')}</h3><p>{t('step3Copy')}</p></article>
          </div>
        </section>

        <section className="privacy-section" id="privacy">
          <div className="privacy-icon"><LockKeyhole size={28} /></div>
          <div><div className="section-kicker">{t('privacyFirst')}</div><h2>{t('yours')}</h2></div>
          <p>{t('privacyCopy')}</p>
        </section>
      </main>

      <footer>
        <div className="brand"><span className="brand-mark">K</span><span>Kou</span></div>
        <p>{t('footer')}</p>
        <a href="https://github.com/ufoym/kou" target="_blank" rel="noreferrer"><Github size={17} /> {t('source')}</a>
      </footer>
    </div>
  )
}

export default App
