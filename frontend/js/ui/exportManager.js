/**
 * 导出功能管理类
 */
export class ExportManager {
  constructor(graphHandlers) {
    this.graphHandlers = graphHandlers;
    this.initExportMenu();
    this.bindExportEvents(); // 新增：绑定导出按钮事件
  }

  initExportMenu() {
    const exportOptions = document.getElementById('exportOptions');
    const exportBtn = document.querySelector('.export-btn');

    // 主按钮点击事件
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportOptions.classList.toggle('show');
    });

    // 点击页面其他位置关闭菜单
    document.addEventListener('click', (e) => {
      if (!exportOptions.contains(e.target) && e.target !== exportBtn) {
        exportOptions.classList.remove('show');
      }
    });
  }

  // 新增方法：绑定导出选项事件
  bindExportEvents() {
    const exportOptions = document.getElementById('exportOptions');

    // 使用事件委托处理所有导出选项
    exportOptions.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      e.stopPropagation();

      switch(target.id) {
        case 'export-png-btn':
          this.exportPNG()
            .catch(error => this.showExportError('PNG', error));
          break;
        case 'export-svg-btn':
          this.exportSVG()
            .catch(error => this.showExportError('SVG', error));
          break;
        case 'export-json-btn':
          this.exportJSON()
            .catch(error => this.showExportError('JSON', error));
          break;
           case 'share-graph-btn':
        this.generateGraphIdShareLink();
        break;
      }

      // 点击后关闭菜单
      exportOptions.classList.remove('show');
    });
  }

  // 新增方法：显示导出错误
  showExportError(type, error) {
    console.error(`${type}导出失败:`, error);
    Swal.fire({
      icon: 'error',
      title: `${type}导出失败`,
      text: error.message || '导出过程中发生错误',
      confirmButtonText: '确定'
    });
  }

  async exportPNG() {
    if (!this.graphHandlers.renderer) {
      throw new Error('渲染器未初始化');
    }
    await this.graphHandlers.renderer.exportPNG();
  }

  async exportSVG() {
    if (!this.graphHandlers.renderer) {
      throw new Error('渲染器未初始化');
    }
    await this.graphHandlers.renderer.exportSVG();
  }

  async exportJSON() {
      try {
      await this.graphHandlers.exportJSON();  // 直接调用 graphHandlers 的方法
    } catch (error) {
      console.error('JSON导出失败:', error);
      throw error;
    }
  }
  generateGraphIdShareLink() {
  const graphId = this.graphHandlers.currentGraphId;
  if (!graphId || graphId === "all") {
    Swal.fire("分享失败", "请选择一个具体图谱后再分享", "warning");
    return;
  }

  const shareUrl = `${window.location.origin}/public_graph.html?graph_id=${graphId}`;
  navigator.clipboard.writeText(shareUrl)
    .then(() => {
      Swal.fire("分享链接已复制", shareUrl, "success");
    })
    .catch(() => {
      Swal.fire("复制失败", "请手动复制链接：" + shareUrl, "error");
    });
}
}