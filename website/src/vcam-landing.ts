import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { animate, stagger, spring, splitText } from 'animejs'
import logoUrl from './assets/logo.png'

const i18n = {
  en: {
    heroTitle: html`Take Control of Your <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-glow to-primary bg-[length:200%_auto] animate-gradient">Virtual Camera</span> for Dev`,
    heroDesc: 'A modern, lightweight interface to control your virtual camera. Easily bind global hotkeys and manage your camera status without breaking focus.',
    downloadBtn: (version: string) => `Download for Windows ${version}`,
    exploreBtn: 'Explore Features',
    osNote: 'Linux and macOS are not supported yet.',
    whyUse: 'Why use VCam Control?',
    feat1Title: 'Global Shortcuts',
    feat1Desc: 'Set up custom global hotkeys to toggle camera status instantly from anywhere, without interrupting your workflow.',
    feat2Title: 'Lightweight Utility',
    feat2Desc: 'Built with Tauri. Runs quietly in the background with near-zero memory and CPU usage.',
    feat3Title: 'Open Source',
    feat3Desc: 'Fully open-source and community driven. Source code hosted directly on GitHub.',
    by: 'by',
    openSourceSoftware: 'Open source software.'
  },
  vi: {
    heroTitle: html`Kiểm Soát <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-glow to-primary bg-[length:200%_auto] animate-gradient">Camera Ảo</span> Cho Dev`,
    heroDesc: 'Giao diện điều khiển camera ảo hiện đại, siêu nhẹ. Dễ dàng cài đặt phím tắt toàn cầu và quản lý trạng thái camera mà không làm gián đoạn công việc.',
    downloadBtn: (version: string) => `Tải cho Windows ${version}`,
    exploreBtn: 'Khám phá tính năng',
    osNote: 'Hiện chưa hỗ trợ Linux và macOS.',
    whyUse: 'Tại sao nên dùng VCam Control?',
    feat1Title: 'Phím Tắt Toàn Cầu',
    feat1Desc: 'Cài đặt phím tắt để bật/tắt camera ngay lập tức từ bất kỳ đâu mà không cần chuyển qua lại giữa các cửa sổ.',
    feat2Title: 'Siêu Nhẹ & Mượt Mà',
    feat2Desc: 'Phát triển bằng Tauri. Chạy ngầm mượt mà với mức tiêu thụ CPU và RAM gần như bằng 0.',
    feat3Title: 'Mã Nguồn Mở',
    feat3Desc: 'Hoàn toàn mã nguồn mở và phát triển bởi cộng đồng. Toàn bộ mã nguồn được công khai trên GitHub.',
    by: 'bởi',
    openSourceSoftware: 'Open source software.'
  }
};

@customElement('vcam-landing')
export class VcamLanding extends LitElement {
  @state() theme: 'light' | 'dark' = 'dark'
  @state() downloadUrl: string = 'https://github.com/ngtuonghy/vcam-control/releases/latest'
  @state() version: string = '(v0.1.0)'
  @state() lang: 'en' | 'vi' = 'en'

  private titleSplitter: any = null;
  private authorSplitter: any = null;

  constructor() {
    super();
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    this.theme = storedTheme || (prefersDark ? 'dark' : 'light')
    this.applyTheme()
    
    const storedLang = localStorage.getItem('lang') as 'en' | 'vi';
    if (storedLang) {
      this.lang = storedLang;
    } else if (navigator.language.toLowerCase().startsWith('vi')) {
      this.lang = 'vi';
    }
  }

  applyTheme() {
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
  }

  cycleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
  }

  firstUpdated() {
    this.fetchLatestRelease();

    animate(this.querySelectorAll('.anim-hero'), {
      translateY: [30, 0],
      opacity: [0, 1],
      ease: 'outExpo',
      duration: 1200,
      delay: stagger(150, { start: 200 })
    });

    animate(this.querySelectorAll('.anim-hero-title'), {
      translateY: [60, 0],
      opacity: [0, 1],
      ease: spring({ mass: 1, stiffness: 100, damping: 12, velocity: 0 }),
      delay: 100
    });

    this.initAnimations();
  }

  initAnimations() {
    animate(this.querySelectorAll('.anim-hero'), {
      translateY: [60, 0],
      opacity: [0, 1],
      ease: spring({ mass: 1, stiffness: 100, damping: 12, velocity: 0 }),
      delay: stagger(100, { start: 300 })
    });

    animate(this.querySelectorAll('.anim-card'), {
      translateY: [50, 0],
      opacity: [0, 1],
      ease: spring({ mass: 1, stiffness: 90, damping: 10, velocity: 0 }),
      delay: stagger(150, { start: 600 })
    });

    this.runTextSplits();

    animate(this.querySelectorAll('.anim-icon'), {
      scale: [0.2, 1],
      rotate: ['-15deg', '0deg'],
      opacity: [0, 1],
      ease: spring({ mass: 1, stiffness: 80, damping: 10, velocity: 0 }),
      delay: stagger(150, { start: 800 })
    });

    animate(this.querySelectorAll('.anim-blob-1'), {
      scale: [1, 1.1, 1],
      translateX: ['-50%', '-45%', '-50%'],
      translateY: ['-50%', '-55%', '-50%'],
      ease: 'inOutSine',
      duration: 8000,
      loop: true
    });
    
    animate(this.querySelectorAll('.anim-blob-2'), {
      scale: [1, 1.2, 1],
      translateX: ['-50%', '-55%', '-50%'],
      translateY: ['-50%', '-45%', '-50%'],
      ease: 'inOutSine',
      duration: 10000,
      loop: true
    });
  }

  runTextSplits() {
    if (this.titleSplitter) this.titleSplitter.revert();
    this.titleSplitter = splitText(this.querySelectorAll('.anim-card-title'), { chars: true });
    this.titleSplitter.addEffect(() => {
      animate(this.titleSplitter.chars, {
        translateY: [15, 0],
        opacity: [0, 1],
        ease: spring({ mass: 1, stiffness: 100, damping: 10, velocity: 0 }),
        delay: stagger(10, { start: 100 })
      });
    });

    // Author text RGB glowing cascade loop
    if (this.authorSplitter) this.authorSplitter.revert();
    this.authorSplitter = splitText(this.querySelectorAll('.anim-author'), { chars: true });
    this.authorSplitter.addEffect(() => {
      animate(this.authorSplitter.chars, {
        color: ['inherit', '#a855f7', '#ec4899', 'inherit'],
        ease: 'inOutSine',
        duration: 2000,
        delay: stagger(100),
        loop: true
      });
    });
  }

  toggleLanguage() {
    const nextLang = this.lang === 'en' ? 'vi' : 'en';
    localStorage.setItem('lang', nextLang);
    window.location.reload();
  }

  async fetchLatestRelease() {
    try {
      const response = await fetch('https://api.github.com/repos/ngtuonghy/vcam-control/releases/latest');
      if (response.ok) {
        const data = await response.json();
        const asset = data.assets.find((a: any) => a.name.endsWith('-setup.exe') || a.name.endsWith('.exe'));
        if (asset) this.downloadUrl = asset.browser_download_url;
        if (data.tag_name) this.version = `(${data.tag_name})`;
      }
    } catch (error) { console.error(error); }
  }

  createRenderRoot() { return this; }

  render() {
    const t = i18n[this.lang];
    
    return html`
      <div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <header class="py-6 px-8 border-b border-border flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div class="text-xl font-bold tracking-tight flex items-center gap-3">
            <img src=${logoUrl} alt="VCam Control Logo" class="w-10 h-10 rounded-lg shadow-sm shadow-primary/20" />
            VCam Control
          </div>
          <nav class="flex items-center gap-4 sm:gap-6">
            <span class="anim-author text-sm text-muted-foreground font-medium hidden sm:inline-block">
              <span class="text-primary font-bold">ngtuonghy</span>
            </span>
            <a href="https://github.com/ngtuonghy/vcam-control" target="_blank" rel="noopener noreferrer" class="text-sm font-medium hover:text-primary transition-colors">GitHub</a>
            <div class="flex items-center gap-2 border-l border-border pl-4">
              <button @click=${this.toggleLanguage} class="w-9 h-9 flex items-center justify-center rounded-md bg-surface hover:bg-surface-hover transition-colors text-xs font-bold text-muted-foreground hover:text-foreground border border-border" title="Switch Language">
                ${this.lang === 'en' ? 'EN' : 'VI'}
              </button>
              <button @click=${this.cycleTheme} class="w-9 h-9 flex items-center justify-center rounded-md bg-surface hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground border border-border" title="Toggle Theme">
                ${this.theme === 'light' ? html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>` : html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`}
              </button>
            </div>
          </nav>
        </header>

        <main class="relative flex-grow flex flex-col items-center justify-center px-6 py-20 md:py-32 text-center overflow-hidden z-0">
          <div class="absolute inset-0 bg-grid -z-20 pointer-events-none"></div>
          <div class="anim-blob-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          <div class="anim-blob-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-accent/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <h1 class="anim-hero-title opacity-0 text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter mb-6 max-w-4xl leading-[1.1]">
            ${t.heroTitle}
          </h1>
          <p class="anim-hero opacity-0 text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            ${t.heroDesc}
          </p>
          <div class="anim-hero opacity-0 flex flex-col sm:flex-row gap-4">
            <a href=${this.downloadUrl} class="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow-lg shadow-primary/25 transition-all">
              ${t.downloadBtn(this.version)}
            </a>
            <a href="#features" class="px-8 py-4 bg-secondary text-secondary-foreground font-semibold rounded-lg transition-all border border-border">
              ${t.exploreBtn}
            </a>
          </div>
          <p class="anim-hero opacity-0 mt-6 text-sm text-muted-foreground/60">
            ${t.osNote}
          </p>
        </main>

        <section id="features" class="py-24 bg-surface border-t border-border">
          <div class="container mx-auto px-6 max-w-5xl">
            <h2 class="anim-hero opacity-0 text-3xl font-bold tracking-tight mb-12 text-center">${t.whyUse}</h2>
            <div class="grid md:grid-cols-3 gap-8">
              <div class="anim-card opacity-0 bg-card p-8 rounded-lg border border-border shadow-sm">
                <div class="anim-icon opacity-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <h3 class="anim-card-title text-xl font-bold mb-3">${t.feat1Title}</h3>
                <p class="text-muted-foreground leading-relaxed">${t.feat1Desc}</p>
              </div>

              <div class="anim-card opacity-0 bg-card p-8 rounded-lg border border-border shadow-sm">
                <div class="anim-icon opacity-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <h3 class="anim-card-title text-xl font-bold mb-3">${t.feat2Title}</h3>
                <p class="text-muted-foreground leading-relaxed">${t.feat2Desc}</p>
              </div>

              <div class="anim-card opacity-0 bg-card p-8 rounded-lg border border-border shadow-sm">
                <div class="anim-icon opacity-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                </div>
                <h3 class="anim-card-title text-xl font-bold mb-3">${t.feat3Title}</h3>
                <p class="text-muted-foreground leading-relaxed">${t.feat3Desc}</p>
              </div>
            </div>
          </div>
        </section>

        <footer class="py-10 text-center text-sm text-muted-foreground border-t border-border">
          <p>&copy; ${new Date().getFullYear()} VCam Control. ${t.openSourceSoftware}</p>
        </footer>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vcam-landing': VcamLanding
  }
}
