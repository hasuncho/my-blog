(function () {
  function getPosts() {
    return window.BLOG_POSTS || [];
  }

  function getPostBySlug(slug) {
    return getPosts().find((post) => post.slug === slug) || null;
  }

  window.Blog = window.Blog || {};
  window.Blog.getPosts = getPosts;
  window.Blog.getPostBySlug = getPostBySlug;
})();
