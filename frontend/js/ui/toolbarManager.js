/**
 * 工具栏管理类
 */
export class ToolbarManager {
  constructor() {
    this.initTabs();
    this.initFileUpload();
    this.initGraphSelect();
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
    document.getElementById("upload-file").addEventListener("change", function() {
      const fileName = this.files[0]?.name || "未选择文件";
      document.getElementById("file-name").textContent = fileName;
    });
  }

  initGraphSelect() {
    document.getElementById("graphSelect").addEventListener("change", function() {
      if (this.value !== "") {
        this.querySelector("option[value='']").disabled = true;
      }
    });
  }
}