// themeInit.js
import colorManager from './colorThemeManager.js';

let graphRendererRef = null;

export function registerRenderer(renderer) {
  graphRendererRef = renderer;
}

export function initThemeSystem() {
  const applyTheme = (theme) => {
  document.body.classList.toggle('dark-theme', theme === 'dark');
  updateThemeButton(theme);

  if (graphRendererRef) {
    // 改为调用 updateStyles 而不是 renderGraph
    graphRendererRef.updateStyles();
  }
};

  const updateThemeButton = (theme) => {
    const themeText = document.getElementById('theme-text');
    const themeIcon = document.getElementById('theme-icon');
    if (themeText && themeIcon) {
      themeText.textContent = theme === 'dark' ? '切换至浅色模式' : '切换至深色模式';
      themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  };

  colorManager.options.onThemeChange = applyTheme;
  applyTheme(colorManager.currentTheme);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      colorManager.currentTheme = e.matches ? 'dark' : 'light';
      localStorage.setItem('theme', colorManager.currentTheme);
      if (graphRendererRef?.currentData) {
        graphRendererRef.renderGraph(graphRendererRef.currentData);
      }
    });
  }
}

export async function toggleTheme() {
 const newTheme = await colorManager.toggleTheme();
 console.log('[themeInit] toggleTheme - renderer ID:', graphRendererRef?.id);
console.log('[themeInit] toggleTheme - currentData 节点数:', graphRendererRef?.currentData?.nodes?.length);

if (!graphRendererRef?.currentData) {
  console.warn('[themeInit] 当前没有图谱数据，跳过重绘（可能是首次加载前）');
  return;
}
graphRendererRef.renderGraph(graphRendererRef.currentData);


  return newTheme;
}

export { colorManager };
