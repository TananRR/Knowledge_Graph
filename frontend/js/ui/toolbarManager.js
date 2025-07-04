export class ToolbarManager {
  constructor() {
    this.initTabs();
    this.initFileUpload();
    this.initGraphSelect();
    this.initAutoCollapse(); // 添加自动收起逻辑
  }

  initTabs() {
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
      });
    });
  }

  initFileUpload() {
    document.getElementById("upload-file").addEventListener("change", function () {
      const fileName = this.files[0]?.name || "未选择文件";
      document.getElementById("file-name").textContent = fileName;
    });
  }

  initGraphSelect() {
    document.getElementById("graphSelect").addEventListener("change", function () {
      if (this.value !== "") {
        this.querySelector("option[value='']").disabled = true;
      }
    });
  }

  initAutoCollapse() {
    const toolbar = document.getElementById("main-toolbar");
    let hideTimer = null;

    const collapseToolbar = () => {
      toolbar.classList.add("collapsed");
    };

    const expandToolbar = () => {
      toolbar.classList.remove("collapsed");
      resetTimer();
    };

    const resetTimer = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        collapseToolbar();
      }, 5000);
    };

    // 鼠标移入工具栏：展开 + 重置计时
    toolbar.addEventListener("mouseenter", expandToolbar);

    // 鼠标移动靠近屏幕左边也展开
    document.addEventListener("mousemove", (e) => {
      const isNearLeft = e.clientX < 50;
      const isInsideToolbar = toolbar.contains(e.target);
      if (isNearLeft || isInsideToolbar) {
        expandToolbar();
      }
    });

    // 初始也设定一次
    resetTimer();
  }
}
