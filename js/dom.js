(function () {
  const ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
  }

  function renderTags(tags) {
    if (!tags || !tags.length) return "";
    return `<span class="tag-list">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</span>`;
  }

  window.Blog = window.Blog || {};
  window.Blog.escapeHtml = escapeHtml;
  window.Blog.renderTags = renderTags;
})();
