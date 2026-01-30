(function() {
  'use strict';

  console.log('[n8n-tree] v10 loaded');

  if (!location.hostname.includes('n8n')) return;

  const ICONS = {
    chevron: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
    folderOpen: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>',
    workflow: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>'
  };

  const CSS = `
    #n8n-tree-view {
      border-top: 1px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 8px;
    }
    #n8n-tree-view .tree-header {
      color: #666;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 8px 12px;
      letter-spacing: 0.5px;
    }
    #n8n-tree-content {
      padding: 0 4px;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 500px;
      max-height: 500px;
    }
    .n8n-tree-item {
      display: flex;
      align-items: center;
      padding: 5px 8px;
      cursor: pointer;
      border-radius: 4px;
      margin: 1px 0;
      white-space: nowrap;
    }
    .n8n-tree-item:hover {
      background: #f5f5f5;
    }
    .n8n-tree-chevron {
      width: 18px;
      height: 18px;
      color: #888;
      transition: transform 0.15s;
      flex-shrink: 0;
    }
    .n8n-tree-chevron.collapsed {
      transform: rotate(-90deg);
    }
    .n8n-tree-icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      flex-shrink: 0;
    }
    .n8n-tree-icon.folder { color: #f59e0b; }
    .n8n-tree-icon.workflow { color: #22c55e; }
    .n8n-tree-label {
      color: #333;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }
    .n8n-tree-count {
      color: #999;
      font-size: 11px;
      margin-left: 6px;
      flex-shrink: 0;
    }
    .n8n-tree-children {
      margin-left: 12px;
    }
    .n8n-tree-empty {
      color: #999;
      font-size: 12px;
      padding: 4px 8px;
      font-style: italic;
    }
  `;

  function injectStyles() {
    if (document.getElementById('n8n-tree-styles')) return;
    const style = document.createElement('style');
    style.id = 'n8n-tree-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function getProjectIdFromUrl() {
    const match = location.pathname.match(/\/projects\/([^/]+)/);
    return match ? match[1] : null;
  }

  function getWorkflowIdFromUrl() {
    const match = location.pathname.match(/\/workflow\/([^/]+)/);
    return match ? match[1] : null;
  }

  let workflowProjectCache = {};

  async function getProjectIdForWorkflow(workflowId) {
    if (workflowProjectCache[workflowId]) {
      return workflowProjectCache[workflowId];
    }
    try {
      const data = await api(`/rest/workflows/${workflowId}`);
      const projectId = data.data?.homeProject?.id;
      if (projectId) {
        workflowProjectCache[workflowId] = projectId;
      }
      return projectId;
    } catch (e) {
      console.log('[n8n-tree] failed to get workflow project:', e);
      return null;
    }
  }

  function getExpandedFolders() {
    try {
      return JSON.parse(localStorage.getItem('n8n-tree-expanded') || '{}');
    } catch { return {}; }
  }

  function saveExpandedFolders(expanded) {
    localStorage.setItem('n8n-tree-expanded', JSON.stringify(expanded));
  }

  function setFolderExpanded(folderId, isExpanded) {
    const expanded = getExpandedFolders();
    if (isExpanded) {
      expanded[folderId] = true;
    } else {
      delete expanded[folderId];
    }
    saveExpandedFolders(expanded);
  }

  function isFolderExpanded(folderId) {
    return getExpandedFolders()[folderId] === true;
  }

  async function api(endpoint) {
    const r = await fetch(location.origin + endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'browser-id': localStorage.getItem('n8n-browserId') || ''
      }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  async function getFolders(projectId, parentFolderId = '0') {
    const filter = encodeURIComponent(JSON.stringify({
      isArchived: false,
      parentFolderId: parentFolderId,
      projectId: projectId
    }));
    const data = await api(`/rest/workflows?includeScopes=true&includeFolders=true&filter=${filter}&skip=0&take=100&sortBy=name:asc`);
    return data.data || [];
  }

  function workflowEl(w) {
    const d = document.createElement('div');
    d.className = 'n8n-tree-node';
    d.innerHTML = `
      <div class="n8n-tree-item">
        <span style="width:18px;"></span>
        <span class="n8n-tree-icon workflow">${ICONS.workflow}</span>
        <span class="n8n-tree-label">${w.name}</span>
      </div>
    `;
    d.querySelector('.n8n-tree-item').onclick = () => location.href = location.origin + '/workflow/' + w.id;
    return d;
  }

  function folderEl(f, projectId) {
    const d = document.createElement('div');
    d.className = 'n8n-tree-node';
    const count = (f.workflowCount || 0) + (f.subFolderCount || 0);
    d.innerHTML = `
      <div class="n8n-tree-item">
        <span class="n8n-tree-chevron collapsed">${ICONS.chevron}</span>
        <span class="n8n-tree-icon folder">${ICONS.folder}</span>
        <span class="n8n-tree-label">${f.name}</span>
        ${count ? `<span class="n8n-tree-count">${count}</span>` : ''}
      </div>
      <div class="n8n-tree-children" style="display:none;"></div>
    `;

    const item = d.querySelector('.n8n-tree-item');
    const chevron = d.querySelector('.n8n-tree-chevron');
    const icon = d.querySelector('.n8n-tree-icon');
    const children = d.querySelector('.n8n-tree-children');

    let loaded = false;
    let open = false;

    async function expand() {
      if (!loaded) {
        loaded = true;
        children.innerHTML = '<div class="n8n-tree-empty">Loading...</div>';
        try {
          const items = await getFolders(projectId, f.id);
          children.innerHTML = '';
          const folders = items.filter(i => i.resource === 'folder');
          const workflows = items.filter(i => i.resource !== 'folder');
          folders.forEach(sub => children.appendChild(folderEl(sub, projectId)));
          workflows.forEach(w => children.appendChild(workflowEl(w)));
          if (!folders.length && !workflows.length) {
            children.innerHTML = '<div class="n8n-tree-empty">Empty</div>';
          }
        } catch(e) {
          children.innerHTML = '<div class="n8n-tree-empty" style="color:#e55;">Error</div>';
          loaded = false;
        }
      }
      open = true;
      children.style.display = 'block';
      chevron.classList.remove('collapsed');
      icon.innerHTML = ICONS.folderOpen;
      setFolderExpanded(f.id, true);
    }

    function collapse() {
      open = false;
      children.style.display = 'none';
      chevron.classList.add('collapsed');
      icon.innerHTML = ICONS.folder;
      setFolderExpanded(f.id, false);
    }

    item.onclick = async (e) => {
      e.stopPropagation();
      if (!open) await expand();
      else collapse();
    };

    if (isFolderExpanded(f.id)) {
      setTimeout(() => expand(), 10);
    }

    return d;
  }

  async function loadTree(content, projectId) {
    content.innerHTML = '<div class="n8n-tree-empty">Loading...</div>';
    try {
      const items = await getFolders(projectId, '0');
      content.innerHTML = '';
      const folders = items.filter(i => i.resource === 'folder');
      const workflows = items.filter(i => i.resource !== 'folder');
      if (!folders.length && !workflows.length) {
        content.innerHTML = '<div class="n8n-tree-empty">No folders</div>';
        return;
      }
      folders.forEach(f => content.appendChild(folderEl(f, projectId)));
      workflows.forEach(w => content.appendChild(workflowEl(w)));
    } catch(e) {
      content.innerHTML = '<div class="n8n-tree-empty" style="color:#e55;">Failed to load</div>';
    }
  }

  function inject(projectId) {
    console.log('[n8n-tree] inject() called with projectId:', projectId);

    if (document.getElementById('n8n-tree-view')) {
      console.log('[n8n-tree] tree already exists');
      return true;
    }

    if (!projectId) {
      console.log('[n8n-tree] no projectId');
      return true;
    }

    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) {
      console.log('[n8n-tree] no sidebar');
      return false;
    }

    const allElements = sidebar.querySelectorAll('*');
    let sideMenu = null;

    for (const el of allElements) {
      if (el.className && typeof el.className === 'string') {
        if (el.className.includes('_sideMenu_') ||
            el.className.includes('_projects_') ||
            el.className.includes('_menuContent_')) {
          sideMenu = el;
          console.log('[n8n-tree] found:', el.className.substring(0, 60));
          break;
        }
      }
    }

    if (!sideMenu) {
      console.log('[n8n-tree] no sideMenu element found in sidebar');
      return false;
    }

    injectStyles();

    const container = document.createElement('div');
    container.id = 'n8n-tree-view';
    container.innerHTML = `
      <div class="tree-header">Folders</div>
      <div id="n8n-tree-content"></div>
    `;

    let insertPoint = null;
    const allMenuItems = sideMenu.querySelectorAll('*');

    for (const el of allMenuItems) {
      if (el.className && typeof el.className === 'string') {
        if (el.className.includes('_bottomMenu_') ||
            el.className.includes('_menuFooter_')) {
          insertPoint = el;
          console.log('[n8n-tree] found bottom menu:', el.className.substring(0, 60));
          break;
        }
      }
    }

    if (insertPoint) {
      insertPoint.parentElement.insertBefore(container, insertPoint);
      console.log('[n8n-tree] container inserted before bottom menu');
    } else {
      sideMenu.appendChild(container);
      console.log('[n8n-tree] container appended (no insert point found)');
    }

    const content = document.getElementById('n8n-tree-content');
    if (content) {
      loadTree(content, projectId);
      return true;
    }

    return false;
  }

  let currentProjectId = null;
  let currentPath = null;

  async function checkAndInject() {
    if (location.pathname.includes('/signin') || location.pathname.includes('/login')) {
      currentProjectId = null;
      currentPath = null;
      return;
    }

    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;

    let projectId = getProjectIdFromUrl();
    const workflowId = getWorkflowIdFromUrl();

    if (!projectId && workflowId) {
      projectId = await getProjectIdForWorkflow(workflowId);
    }

    if (!projectId) {
      const existing = document.getElementById('n8n-tree-view');
      if (existing) existing.remove();
      currentProjectId = null;
      currentPath = null;
      return;
    }

    if (projectId !== currentProjectId || location.pathname !== currentPath) {
      console.log('[n8n-tree] context changed:', currentProjectId, '->', projectId);
      const existing = document.getElementById('n8n-tree-view');
      if (existing) existing.remove();
      currentProjectId = projectId;
      currentPath = location.pathname;

      tryInject(10, projectId);
    }
  }

  function tryInject(retries, projectId) {
    if (retries <= 0) {
      console.log('[n8n-tree] giving up after retries');
      return;
    }

    const success = inject(projectId);
    if (!success) {
      console.log('[n8n-tree] inject failed, retrying...', retries - 1, 'left');
      setTimeout(() => tryInject(retries - 1, projectId), 300);
    }
  }

  setInterval(checkAndInject, 500);

})();
