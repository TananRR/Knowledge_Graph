// 正确路径（从 app.js 所在位置出发）
// app.js
import colorManager from './theme/colorThemeManager.js';
import { GraphHandlers } from './graph/graphHandlers.js';
import { GraphRenderer } from './graph/graphRenderer.js';
import { ToolbarManager } from './ui/toolbarManager.js';
import { ExportManager } from './ui/exportManager.js';
import { initThemeSystem, toggleTheme, registerRenderer } from './theme/themeInit.js';

// 创建 GraphRenderer 实例
const graphRenderer = new GraphRenderer(null); // 先传 null 占位

const graphHandlers = new GraphHandlers(graphRenderer);
graphRenderer.graphHandlers = graphHandlers; // ✅ 互相引用

// 注册 graphRenderer 到 themeInit
registerRenderer(graphRenderer);


const exportManager = new ExportManager(graphHandlers);  // 传入 graphHandlers 而不是 graphRenderer
const toolbarManager = new ToolbarManager();
// 粒子状态控制
let particlesEnabled = true;
// 初始化应用
async function initApp() {
initThemeSystem();
console.log("注册 renderer 实例 ID:", graphRenderer.id);
  // 加载用户图谱列表
  const userId = sessionStorage.getItem('currentUser') || 'default_user';
  try {
    const graphIds = await graphHandlers.loadGraphList(userId);
    if (graphIds.length > 0) {
      const lastGraphId = graphIds[graphIds.length - 1];

  graphHandlers.currentGraphId = lastGraphId;  // ✅ 明确设置当前图谱 ID
  graphRenderer.currentGraphId = lastGraphId;

  await graphHandlers.loadGraphById(lastGraphId);
    } else {
      // 如果没有图谱，显示提示信息
      Swal.fire({
        icon: 'info',
        title: '暂无图谱',
        text: '您目前没有可用的图谱，请上传新的图谱数据。',
        confirmButtonText: '确定'
      });
    d3.select("svg").selectAll("*").remove();
    d3.select("svg").append("text")
      .attr("x", window.innerWidth / 2)
      .attr("y", window.innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("fill", "#666")
      .text("图谱中没有数据，请先上传数据");

    }
  } catch (error) {
    showError(error);
  }
}

// 全局导出函数
window.handleSearch = () => graphHandlers.handleSearch().catch(showError);
window.handleUpload = () => graphHandlers.handleUpload().catch(showError);
window.loadSelectedGraph = () => graphHandlers.loadSelectedGraph().catch(showError);
window.handleDeleteGraph = () => graphHandlers.handleDeleteGraph().catch(showError);
window.handleDeleteByUser = () => graphHandlers.handleDeleteByUser().catch(showError);
window.DeleteUser = () => graphHandlers.handleDeleteUser().catch(showError);
window.logoutUser = () => {
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('currentUser');
  localStorage.removeItem('rememberedUser');
  window.location.href = 'index.html';
};
window.toggleTheme = toggleTheme;
window.exportPNG = () => exportManager.exportPNG().catch(showError);
window.exportSVG = () => exportManager.exportSVG().catch(showError);
window.exportJSON = () => exportManager.exportJSON().catch(showError);
// 粒子控制函数
window.toggleParticles = () => {
    particlesEnabled = !particlesEnabled;
    const particles = document.getElementById('particles-js');
    particles.style.display = particlesEnabled ? 'block' : 'none';
    document.getElementById('particleToggleText').textContent =
        particlesEnabled ? '关闭粒子效果' : '开启粒子效果';
};

window.adjustParticles = async () => {
  // 使用 Swal 弹窗替代原生 prompt
  const { value: count } = await Swal.fire({
    title: '调整粒子数量',
    input: 'range',
    inputLabel: '粒子数量 (20-200)',
    inputAttributes: {
      min: 20,
      max: 200,
      step: 1
    },
    inputValue: window.pJSDom[0]?.pJS?.particles?.number?.value || 80,
    showCancelButton: true,
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    customClass: {
     popup: 'rounded-swal', // ✅ 添加自定义类名
     validationMessage: 'my-validation-message'
    },
    preConfirm: (value) => {
      if (!value) {
        Swal.showValidationMessage('请输入有效数值');
      }
      return value;
    }
  });

  if (count) {
    try {
      // 显示加载状态
      Swal.fire({
        title: '正在调整粒子...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 实际调整粒子
      const num = Math.min(Math.max(parseInt(count), 20), 200);
      window.pJSDom[0].pJS.particles.number.value = num;
      window.pJSDom[0].pJS.fn.particlesRefresh();

      // 关闭加载状态并显示成功提示
      Swal.fire({
        icon: 'success',
        title: '调整成功',
        text: `粒子数量已设置为 ${num}`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: '调整失败',
        text: error.message || '粒子调整时发生错误'
      });
    }
  }
};

// 错误处理
function showError(error) {
  console.error(error);
  Swal.fire({
    icon: 'error',
    title: '操作失败',
    text: error.message || '发生未知错误',
    confirmButtonColor: '#d33'
  });
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);