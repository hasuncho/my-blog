window.BLOG_POSTS = [
  {
    "slug": "today-i-learned",
    "title": "오늘 배운 것",
    "date": "2026-07-02",
    "tags": [
      "회고",
      "학습"
    ],
    "excerpt": "클로드 코드로 블로그를 만들면서 HTML, CSS, JavaScript가 각각 어떤 역할을 하는지 정리해봤습니다.",
    "contentHtml": "<p>클로드 코드와 함께 이 블로그를 프레임워크 없이 만들면서, HTML·CSS·JavaScript가 각각 어떤 역할을 맡는지 다시 한번 명확하게 정리할 수 있었습니다.</p>\n<h2>HTML: 뼈대와 콘텐츠</h2>\n<p><code>index.html</code> 하나에 헤더, <code>#app</code> 영역, 푸터만 있는 최소한의 뼈대만 있습니다. 실제 글 목록과 본문은 페이지가 로드된 뒤 JavaScript가 <code>#app</code> 안에 채워 넣습니다. 즉 HTML은 &quot;무엇이 어디에 위치할 것인가&quot;를 정의하는 골격 역할만 합니다.</p>\n<h2>CSS: 표현과 반응형</h2>\n<p>색상, 여백, 타이포그래피는 모두 CSS 변수(<code>--color-bg</code>, <code>--color-text</code> 등)로 관리했습니다.</p>\n<ul><li><code>variables.css</code>에 라이트/다크 테마 값을 정의해두면, JavaScript는 <code>&lt;html&gt;</code>에 <code>data-theme</code> 속성 하나만 바꿔주면 됩니다.</li><li><code>layout.css</code>의 <code>min-width</code> 미디어쿼리로 모바일 우선 반응형을 구현했습니다.</li></ul>\n<p>CSS는 &quot;어떻게 보일 것인가&quot;를 담당하고, 화면 크기나 테마가 바뀌어도 JavaScript 코드를 건드릴 필요가 없다는 점이 좋았습니다.</p>\n<h2>JavaScript: 데이터와 동작</h2>\n<p>JavaScript는 세 가지 일을 합니다.</p>\n<ol><li>빌드 시점(Node)에 마크다운 파일을 읽어 HTML로 미리 변환하고 <code>posts-data.js</code>를 생성</li><li>해시(<code>#/</code>, <code>#/post/&lt;slug&gt;</code>)를 읽어서 목록 뷰와 상세 뷰를 전환</li><li>다크모드 토글 클릭과 <code>localStorage</code> 저장을 처리</li></ol>\n<p>특히 마크다운 변환을 브라우저가 아니라 <strong>빌드 시점에 미리 끝내둔 덕분에</strong>, 브라우저는 <code>fetch()</code> 없이 파일을 그냥 열어도(<code>file://</code>) 정상적으로 동작하게 되었습니다.</p>\n<h2>정리</h2>\n<p>결국 HTML은 구조, CSS는 표현, JavaScript는 데이터 처리와 상호작용을 담당한다는 원칙은 프레임워크가 있든 없든 동일하다는 걸 다시 확인한 하루였습니다.</p>"
  },
  {
    "slug": "markdown-demo",
    "title": "마크다운 문법 테스트",
    "date": "2026-06-28",
    "tags": [
      "마크다운",
      "테스트"
    ],
    "excerpt": "이 블로그가 지원하는 마크다운 문법을 모아서 확인하는 글입니다.",
    "contentHtml": "<p>이 글은 파서가 지원하는 문법을 모아서 확인하기 위한 글입니다.</p>\n<h2>텍스트 스타일</h2>\n<p><strong>굵게</strong>, <em>기울임</em>, 그리고 <code>인라인 코드</code>를 지원합니다.</p>\n<h2>목록</h2>\n<ul><li>순서 없는 목록 항목 1</li><li>순서 없는 목록 항목 2</li></ul>\n<ol><li>순서 있는 목록 항목 1</li><li>순서 있는 목록 항목 2</li></ol>\n<h2>인용문</h2>\n<blockquote><p>좋은 코드는 짧은 코드가 아니라 이해하기 쉬운 코드다.</p></blockquote>\n<h2>링크와 이미지</h2>\n<p><a href=\"https://example.com\">공식 문서 예시 링크</a></p>\n<p><img src=\"https://example.com/sample.png\" alt=\"대체 텍스트 예시\"></p>\n<h2>코드 블록</h2>\n<pre><code class=\"language-js\">function greet(name) {\n  return `안녕하세요, ${name}님!`;\n}</code></pre>\n<h2>안전성 확인용 텍스트</h2>\n<p>이 문단에는 실행되면 안 되는 문자열이 그대로 들어 있습니다: &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; 그리고 &amp; 문자도 이스케이프되어야 합니다.</p>"
  },
  {
    "slug": "second-post",
    "title": "두 번째 이야기",
    "date": "2026-06-15",
    "tags": [
      "일상",
      "회고"
    ],
    "excerpt": "블로그를 만들면서 배운 것들을 정리해봤습니다.",
    "contentHtml": "<p>블로그를 직접 만들면서 배운 점을 정리해봅니다.</p>\n<h3>배운 것들</h3>\n<ol><li>해시 라우팅으로 정적 호스팅에서도 페이지 전환을 구현할 수 있다</li><li>마크다운 파서는 생각보다 단순하게 만들 수 있다</li><li><code>prefers-color-scheme</code>과 <code>localStorage</code>를 함께 쓰면 다크모드 깜빡임을 막을 수 있다</li></ol>\n<blockquote><p>완벽하게 만들기보다, 필요한 만큼만 만드는 것이 중요하다.</p></blockquote>\n<p>다음 글에서는 마크다운 문법을 하나씩 테스트해보겠습니다.</p>"
  },
  {
    "slug": "hello-world",
    "title": "Hello, World!",
    "date": "2026-06-01",
    "tags": [
      "intro",
      "meta"
    ],
    "excerpt": "프레임워크 없이 순수 HTML/CSS/JS로 만든 블로그의 첫 글입니다.",
    "contentHtml": "<p>이 블로그는 <strong>프레임워크 없이</strong> 순수 HTML, CSS, JavaScript만으로 만들어졌습니다. 마크다운 파일을 읽어서 브라우저에서 직접 렌더링합니다.</p>\n<h2>왜 이렇게 만들었나요?</h2>\n<ul><li>빌드 도구 없이도 충분히 빠르게 만들 수 있고</li><li>의존성이 없어서 유지보수가 쉽고</li><li><em>가볍기</em> 때문입니다.</li></ul>\n<p>자세한 내용은 <a href=\"#/post/markdown-demo\">프로젝트 소개</a>에서 확인할 수 있습니다.</p>\n<p>앞으로 이 공간에 이런저런 글을 남겨볼 예정입니다. 잘 부탁드립니다!</p>"
  }
];
