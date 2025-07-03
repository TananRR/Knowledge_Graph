/**
 * 智能颜色管理类
 * 只负责颜色状态管理，不直接操作DOM
 */

class ColorThemeManager {
  constructor(options = {}) {
    this.options = {
      onThemeChange: () => {},
      ...options
    };

    this.colorSchemes = this.createColorSchemes();
    this.currentTheme = this.detectSystemTheme();
    this.arrowCache = new Map();
  }

  // 颜色配置工厂方法
  createColorSchemes() {
    return {
      light: this.createLightScheme(),
      dark: this.createDarkScheme()
    };
  }

  createLightScheme() {
    return {
      node: {
        "Person": "#A8C5EB",
        "Organization": "#F5B8C6",
        "Location": "#9DD3F3",
        "Event": "#C7B3D2",
        "Concept": "#A3D8E0",
        "DATE": "#F0C987",
        "Number": "#B8D9A8",
        "Work": "#D8B3D8",
        default: "#64748b",
        highlight: "#FFDC90",
        muted: "rgba(200, 200, 200, 0.5)"
      },
      link: {
        normal: "rgba(120, 120, 120, 0.6)",
        highlight: "#4a6572",
        muted: "rgba(200, 200, 200, 0.3)",
        text: "#555555"
      },
      arrow: {
        normal: "#999999",
        highlight: "#78909C",
        muted: "#cccccc"
      },
      label: {
        primary: "#333333",
        secondary: "#666666",
        highlight: "#2c3e50",
        background: "#ffffff",
        stroke: "#ffffff"
      },
      background: {
        primary: "rgba(248, 249, 250, 0.8)",
        secondary: "rgba(255, 255, 255, 0.9)"
      }
    };
  }

  createDarkScheme() {
    return {
      node: {
        "Person": "#8DA9C4",
        "Organization": "#D49FB4",
        "Location": "#7DB3D3",
        "Event": "#B39CBF",
        "Concept": "#8BC8D0",
        "DATE": "#D8B977",
        "Number": "#9CC798",
        "Work": "#C89CC8",
        default: "#94a3b8",
        highlight: "#FFC107",
        muted: "rgba(100, 100, 100, 0.5)"
      },
      link: {
        normal: "rgba(180, 180, 180, 0.7)",
        highlight: "#b0bec5",
        muted: "rgba(100, 100, 100, 0.3)",
        text: "#eeeeee"
      },
      arrow: {
        normal: "#D4D4D4",
        highlight: "#FFFFFF",
        muted: "#777777"
      },
      label: {
        primary: "#f5f5f5",
        secondary: "#cccccc",
        highlight: "#ffffff",
        background: "#333333",
        stroke: "#000000"
      },
      background: {
        primary: "rgba(33, 33, 33, 0.9)",
        secondary: "rgba(55, 55, 55, 0.8)"
      }
    };
  }

  // 检测系统主题偏好
  detectSystemTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;

    return this.getSystemPreference();
  }

  // 获取系统偏好
  getSystemPreference() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  // 获取当前颜色配置
  get colors() {
    return this.colorSchemes[this.currentTheme];
  }

  // 切换主题
  async toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.persistTheme();

    await this.options.onThemeChange(this.currentTheme);
    return this.currentTheme;
  }

  // 持久化主题设置
  persistTheme() {
    localStorage.setItem('theme', this.currentTheme);
  }

  // 生成箭头ID
  getArrowId(type) {
    return `arrow-${this.currentTheme}-${type}`;
  }

  // 获取箭头定义配置
  getArrowConfig(type) {
    const color = this.colors.arrow[type];
    if (!color) return null;

    const id = this.getArrowId(type);
    this.arrowCache.set(type, id);

    return {
      id,
      color,
      config: {
        viewBox: "0 -5 10 10",
        refX: 30,
        refY: 0,
        markerWidth: 8,
        markerHeight: 8,
        path: "M0,-5L10,0L0,5"
      }
    };
  }

  // 获取指定类型的箭头引用
  getArrowRef(type = 'normal') {
    const arrowId = this.arrowCache.get(type) || this.arrowCache.get('normal');
    return arrowId ? `url(#${arrowId})` : '';
  }

  // 获取节点颜色
  getNodeColor(nodeType, state = 'normal') {
    return this.colors.node[state] ||
           this.colors.node[nodeType] ||
           this.colors.node.default;
  }

  // 获取连线颜色
  getLinkColor(state = 'normal') {
    return this.colors.link[state] || this.colors.link.normal;
  }

  // 获取标签颜色
  getLabelColor(type = 'primary') {
    return this.colors.label[type] || this.colors.label.primary;
  }

  // 获取背景颜色
  getBackgroundColor(type = 'primary') {
    return this.colors.background[type] || this.colors.background.primary;
  }
}

const colorManager = new ColorThemeManager();
export default colorManager;