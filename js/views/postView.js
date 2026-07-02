(function () {
  const { escapeHtml, renderTags } = window.Blog;

  function renderPostView(post) {
    if (!post) {
      return `
        <a class="back-link" href="#/">&larr; 목록으로</a>
        <p class="empty-state">글을 찾을 수 없습니다.</p>
      `;
    }

    return `
      <a class="back-link" href="#/">&larr; 목록으로</a>
      <article>
        <h1 class="post-detail__title">${escapeHtml(post.title)}</h1>
        <div class="post-detail__meta">
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
          ${renderTags(post.tags)}
        </div>
        ${post.contentHtml}
      </article>
    `;
  }

  window.Blog.renderPostView = renderPostView;
})();
