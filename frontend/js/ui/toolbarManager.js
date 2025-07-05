export class ToolbarManager {
  constructor() {
    this.initTabs();
    this.initFileUpload();
    this.initGraphSelect();
    this.initAutoCollapse(); // 添加自动收起逻辑
    this.initAssistantOverlay();
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
  };

  const resetTimer = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      collapseToolbar();
    }, 5000);
  };

  // 鼠标移入工具栏：展开 + 停止计时
  toolbar.addEventListener("mouseenter", () => {
    expandToolbar();
    clearTimeout(hideTimer);  // 停止收起
  });

  // 鼠标移出工具栏：重设计时器
  toolbar.addEventListener("mouseleave", () => {
    resetTimer();
  });

  // 鼠标靠近左侧屏幕边缘也展开
  document.addEventListener("mousemove", (e) => {
    const isNearLeft = e.clientX < 50;
    if (isNearLeft) {
      expandToolbar();
      resetTimer(); // 鼠标靠近时也重置倒计时
    }
  });

  // 页面初始启动时，5 秒后收起
  resetTimer();
}

  initAssistantOverlay() {
  const overlay = document.getElementById("assistant-overlay");
  const openBtn = document.getElementById("knowledge-query-btn");
  const closeBtn = document.getElementById("assistant-close-btn");
  const sendBtn = document.getElementById("assistant-send-btn");
  const input = document.getElementById("assistant-input");

  openBtn.addEventListener("click", () => {
    overlay.classList.remove("hidden");
    input.focus();
  });

  closeBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    input.value = "";
  });

  sendBtn.addEventListener("click", () => {
    const question = input.value.trim();
    if (!question) return;
    console.log("用户查询知识：", question);

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 查询中...';

    // TODO: 你可以在这里调用你的知识查询逻辑
    setTimeout(() => {
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送';
      sendBtn.disabled = false;
    }, 1500);
  });
}


}
