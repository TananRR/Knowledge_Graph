
import {
  fetchGraphData,
  uploadTextFile,
  searchNodes,
  downloadGraphJSON,
  deleteAllGraphs,
  deleteGraphById,
  deleteGraphsByUser,
  fetchUserGraphIds,
  fetchUserGraphs,
  deleteUser
} from '../api.js';

export class GraphHandlers {
   constructor(renderer) {
    this.renderer = renderer; // ✅ 用共享实例
    this.currentGraphId = null;
    console.log("graphHandlers 使用的 renderer 实例 ID:", this.renderer);

  }

 async loadGraphList(userId) {
    const select = document.getElementById("graphSelect");
    select.innerHTML = "";

    try {
      const data = await fetchUserGraphIds(userId);
      const graphIds = data.graph_ids || [];

      if (graphIds.length >= 2) {
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.text = "加载所有图谱";
        select.appendChild(allOption);
      }

      graphIds.forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.text = id;
        select.appendChild(option);
      });

      return graphIds;
    } catch (err) {
      console.error("加载用户图谱列表失败：", err);
      throw err;
    }
  }

 async handleUpload() {
    const fileInput = document.getElementById("upload-file");
    const file = fileInput.files[0];
    const fileNameDisplay = document.getElementById("file-name");
    const userId = sessionStorage.getItem('currentUser') || "default_user";

    if (!file) {
      throw new Error('请先选择文件！');
    }
     //显示加载中的弹窗
  const swalInstance = Swal.fire({
    title: '文件提取中...',
    html: '请稍候，处理完成后会自动关闭',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

    try {
      const result = await uploadTextFile(file, userId);
      // 关闭加载中弹窗
      await swalInstance.close();
      if (result.status === "success") {
        Swal.fire("成功", "文件提取完成！", "success");
        this.currentGraphId = result.graph_id;
        this.renderer.currentGraphId = result.graph_id;  // ✅ 添加这一行
        await this.loadGraphList(userId);
        const select = document.getElementById("graphSelect");
        select.value = this.currentGraphId;

        const graphData = await fetchGraphData(this.currentGraphId);
        this.renderer.renderGraph(graphData);
        return result;
      } else {
        throw new Error(result.message || "提取失败");
      }
    } finally {
      fileInput.value = "";
      fileNameDisplay.textContent = "";
    }
  }

async handleDeleteGraph() {
  try {
    const userId = sessionStorage.getItem('currentUser') || "default_user";

    if (!this.currentGraphId) {
      await Swal.fire({
        icon: 'warning',
        title: '当前没有选中的图谱！'
      });
      return;
    }

    // 确认对话框
    const result = await Swal.fire({
      title: `确定删除图谱 ${this.currentGraphId} 吗？`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    });

    if (!result.isConfirmed) return;

    // 执行删除
    const deleteResult = await deleteGraphById(this.currentGraphId);

    // 删除成功提示
    await Swal.fire({
      icon: 'success',
      title: '图谱删除成功',
      text: deleteResult.message
    });

    // 清理并重新加载
    this.renderer.clearGraph();
    this.currentGraphId = null;

    const graphIds = await this.loadGraphList(userId);

    if (!graphIds.length) {
      this.renderer.showEmptyMessage();
      return;
    }

    // 默认选中最后一个并加载
    const select = document.getElementById("graphSelect");
    select.value = graphIds[graphIds.length - 1];
    this.currentGraphId = select.value;

    const graphData = await fetchGraphData(this.currentGraphId);
    this.renderer.renderGraph(graphData);

  } catch (error) {
    console.error(error);
    await Swal.fire({
      icon: 'error',
      title: '删除失败！',
      text: error.message
    });
  }
}

async loadGraphById(graphId) {
    try {
      const graphData = await fetchGraphData(graphId);
      this.renderer.renderGraph(graphData);
    } catch (error) {
      throw error;
    }
  }

async handleDeleteByUser() {
  try {
    const userId = sessionStorage.getItem('currentUser') || "default_user";

    if (!userId) {
      await Swal.fire({
        icon: 'warning',
        title: '未获取到用户ID'
      });
      return;
    }
      const graphIds = await this.loadGraphList(userId);

    if (graphIds.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: '没有可删除的图谱',
        text: '当前用户没有任何图谱数据'
      });
      return;
    }

    // 二次确认对话框（更强调危险性）
    const confirmResult = await Swal.fire({
      title: '确认删除？',
      text: '确定删除所有图谱吗？此操作无法撤销！',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#00a8e6',
      confirmButtonText: '是的，删除',
      cancelButtonText: '取消'
    });

    if (!confirmResult.isConfirmed) return;

    // 显示加载状态
    Swal.fire({
      title: '正在删除...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // 执行删除
    const deleteResult = await deleteGraphsByUser(userId);

    // 关闭加载状态并显示成功提示
    Swal.fire({
      title: '删除成功',
      text: deleteResult.message || "用户图谱已成功删除",
      icon: 'success',
      confirmButtonText: '确定'
    });

    // 清理并重新加载
    this.renderer.clearGraph();
    this.currentGraphId = null;

    const newGraphIds = await this.loadGraphList(userId);
    if (!newGraphIds.length) {
      this.renderer.showEmptyMessage();
      return;
    }

    // 默认选中最后一个并加载
    const select = document.getElementById("graphSelect");
    select.value = newGraphIds[newGraphIds.length - 1];
    this.currentGraphId = select.value;

    const graphData = await fetchGraphData(this.currentGraphId);
    this.renderer.renderGraph(graphData);

  } catch (error) {
    console.error(error);
    Swal.fire({
      title: '删除失败',
      text: error.message || '发生错误，请稍后再试',
      icon: 'error',
      confirmButtonText: '确定'
    });
  }
}

async handleSearch() {
  try {
    const keyword = document.getElementById("searchInput").value.trim();

    // 1. 校验输入
    if (!keyword) {
      await Swal.fire({
        icon: 'warning',
        title: '请输入关键词！'
      });
      return false;
    }

    // 2. 显示加载状态
    const loading = Swal.fire({
      title: '搜索中...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // 3. 执行搜索（调用后端）
    const response = await searchNodes(keyword);
    await loading.close();

    const allResults = response|| [];
    const currentGraphId = this.renderer.currentGraphId;
    console.log("当前搜索图谱 ID：", currentGraphId);
    console.log("搜索结果（含图谱ID）:");
allResults.forEach(item => {
  console.log(`• ${item.name} - graph_id: ${item.graph_id}`);
});


    // 4. 过滤结果：当前图谱 + 名称匹配
    const filteredResults = allResults.filter(item =>
      item.graph_id === currentGraphId &&
      (item.name === keyword || item.name.includes(keyword))
    );

    // 5. 没有结果
    if (!filteredResults.length) {
      await Swal.fire({
        icon: 'info',
        title: '未找到相关实体！',
        text: `没有找到与 "${keyword}" 精确相关的实体`
      });
      return false;
    }

    // 6. 高亮匹配节点
    const matchedIds = filteredResults.map(d => d.id);
    if (this.renderer.currentData?.nodes) {
      this.renderer.currentData.nodes.forEach(entity => {
        entity.highlight = matchedIds.includes(entity.id);
      });

      this.renderer.nodeRef.attr("fill", d =>
        d.highlight ? "#FFDC90" : "#009ac8"
      );

      // 7. 构建搜索结果弹窗列表
      const htmlList = filteredResults.map(r => `
        <div class="search-result-item"
             style="cursor:pointer; padding:6px; border-bottom:1px solid #eee"
             data-name="${r.name}">
          🔍 ${r.name}
        </div>
      `).join("");

      await Swal.fire({
        title: `找到 ${filteredResults.length} 个匹配实体`,
        html: `<div style="text-align:left;max-height:300px;overflow:auto">${htmlList}</div>`,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "关闭",
        didRender: () => {
          document.querySelectorAll(".search-result-item").forEach(item => {
            item.addEventListener("click", () => {
              const name = item.getAttribute("data-name");
              this.renderer.focusNode(name); // ✅ 展示邻居也靠这
              Swal.close();
            });
          });
        }
      });

      // 8. 清空搜索框
      document.getElementById("searchInput").value = "";
      return true;
    }

    return false;

  } catch (error) {
    console.error('搜索失败:', error);
    await Swal.fire({
      icon: 'error',
      title: '查询失败！',
      text: error.message || '搜索过程中发生错误'
    });
    return false;
  }
}


  async loadSelectedGraph() {
    const select = document.getElementById("graphSelect");
    const selectedId = select.value;
    if (!selectedId) return;

    if (selectedId === "all") {
      const userId = sessionStorage.getItem('currentUser') || "default_user";
      const allGraphs = await fetchUserGraphs(userId);

      if (!Array.isArray(allGraphs)) {
        throw new Error("返回格式错误：预期为图谱数组");
      }

      const mergedData = {
        nodes: [],
        links: []
      };

      const nodeMap = new Map();
      const linkSet = new Set();

      for (const graph of allGraphs) {
        for (const node of graph.nodes) {
          if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, node);
          }
        }
        for (const link of graph.links) {
          const key = `${link.source}->${link.target}`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            mergedData.links.push(link);
          }
        }
      }

      mergedData.nodes = Array.from(nodeMap.values());
      this.currentGraphId = "all";
      this.renderer.currentGraphId = "all";  // ✅ 保持同步
      this.renderer.renderGraph(mergedData);
    } else {
      this.currentGraphId = selectedId;
      this.renderer.currentGraphId = selectedId;  // ✅ 添加这一行
      const graphData = await fetchGraphData(this.currentGraphId);
      this.renderer.renderGraph(graphData);
    }
  }

  async handleDeleteUser() {
    const currentUser = sessionStorage.getItem('currentUser');
    const { value: password } = await Swal.fire({
      title: '确认删除账户',
      html: `<p>请输入您的密码以确认删除账户</p>`,
      input: 'password',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
        placeholder: '输入账户密码'
      },
      showCancelButton: true,
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      focusConfirm: false,
      preConfirm: (password) => {
        if (!password) {
          Swal.showValidationMessage('请输入密码');
        }
        return password;
      }
    });

    if (!password) return;

    const result = await Swal.fire({
      title: '确定删除账户吗？',
      text: "此操作不可撤销！所有数据将被永久删除。",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    });

    if (!result.isConfirmed) return;
      //显示加载状态
    Swal.fire({
      title: '正在删除...',
      html: '请稍候，正在删除您的账户',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const response = await deleteUser(currentUser, password);
    if (response.message === '用户已删除') {
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('rememberedUser');

    Swal.fire({
    icon: 'success',
    title: '账户已删除',
    text: '您的账户已成功删除',
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false
  }).then(() => {
     console.log("Swal 关闭后跳转开始");
    window.location.href = '/index.html';  // 根据你页面实际位置调整
    });
      return true;
    } else {
      throw new Error(response.message || '删除失败');
    }
  }

  async exportJSON() {
    if (!this.currentGraphId) {
      throw new Error('没有可导出的图谱');
    }
    await downloadGraphJSON(this.currentGraphId);
  }
    // 🔽 添加这里：持久化删除节点方法


}