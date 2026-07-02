(function () {
  const POST_ROUTE_RE = /^#\/post\/([^/]+)\/?$/;

  function renderRoute() {
    const app = document.getElementById("app");
    if (!app) return;

    const postMatch = window.location.hash.match(POST_ROUTE_RE);
    if (postMatch) {
      const slug = decodeURIComponent(postMatch[1]);
      const post = window.Blog.getPostBySlug(slug);
      app.innerHTML = window.Blog.renderPostView(post);
      window.scrollTo(0, 0);
      return;
    }

    const posts = window.Blog.getPosts();
    app.innerHTML = window.Blog.renderListView(posts);
  }

  function initRouter() {
    window.addEventListener("hashchange", renderRoute);
    renderRoute();
  }

  window.Blog = window.Blog || {};
  window.Blog.initRouter = initRouter;
})();
