(function () {
  const { escapeHtml, renderTags } = window.Blog;

  function renderListView(posts) {
    if (!posts.length) {
      return `<p class="empty-state">아직 작성된 글이 없습니다.</p>`;
    }

    const items = posts
      .map(
        (post) => `
        <li class="post-card">
          <a class="post-card__title" href="#/post/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a>
          <div class="post-card__meta">
            <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
            ${renderTags(post.tags)}
          </div>
          <p class="post-card__excerpt">${escapeHtml(post.excerpt)}</p>
        </li>`
      )
      .join("");

    return `<ul class="post-list">${items}</ul>`;
  }

  window.Blog.renderListView = renderListView;
})();
