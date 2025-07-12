# site


```html
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>Hello World</title>
  <script type='application/ld+json'>
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Where to put JSON-LD in HTML",
    "datePublished": "2025-07-12"
  }
  </script>
</head>
<body>
<script type='application/ld+mdx'>
<Header/>
# Hello World

Welcome to the future
<Footer/>
</script>
</body>
</html>
```

- [ ] Should we put the MDX in a script tag?  Or a pre tag?

```html
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>Hello World</title>
  <script type='application/ld+json'>
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Where to put JSON-LD in HTML",
    "datePublished": "2025-07-12"
  }
  </script>
</head>
<body>
<pre>
<Header/>
# Hello World

Welcome to the future
<footer></footer>
</pre>
</body>
</html>
```


```html
<!-- Inert MDX payload -->
<script id="post" type="text/mdx">
# Hello, **MDX**

> Renders right in the browser 🎉

export const Note = () => <aside style={{color:'tomato'}}>A JSX component.</aside>

<Note />
</script>

<div id="root"></div>

<script type="module">
  import React     from "https://esm.sh/react@18?bundle";
  import ReactDOM  from "https://esm.sh/react-dom@18?bundle";
  import { compile } from "https://esm.sh/@mdx-js/mdx@3?bundle";
  import components from "https://mdxui.org/shadcn/LandingPage";

  // 1 Read raw MDX
  const content = document.getElementById("post").textContent;

  // 2 Compile to JSX module code
  const compiled = await compile(content, {
    jsx: true,                      // keep JSX
    outputFormat: "function-body",  // easier eval
    providerImportSource: "@mdx-js/react"
  });

  // 3 Evaluate the module in-page
  const { default: MDXContent } = await import(
    `data:text/javascript;base64,${btoa(String(compiled))}`
  );

  // 4 Render
  ReactDOM.render(
    React.createElement(MDXContent, { components: {} }),
    document.getElementById("root")
  );
</script>
```

```html
<!-- 0 — CDN Tailwind with typography plugin (see §2) -->
<script src="https://cdn.tailwindcss.com?plugins=typography"></script>

<!-- 1 — Raw MDX -->
<script id="content" type="text/ld+mdx">
---
$type: https://schema.org.ai/LandingPage
---

# Hello, **Preact + MDX**

<Note />

export function Note() {
  return <aside className="text-fuchsia-600">This is a Preact component.</aside>;
}

</script>

<!-- 2 — Mount point -->
<div id="root" class="prose mx-auto p-6"></div>

<!-- 3 — Runtime compiler & renderer -->
<script type="module">
  import { render }      from "https://esm.sh/preact@10?bundle";
  import { compile }     from "https://esm.sh/@mdx-js/mdx@3?bundle";

  const mdx = document.getElementById("content").textContent;

  const compiled = await compile(mdx, {
    jsx: true,
    jsxRuntime: "automatic",
    jsxImportSource: "preact",
    outputFormat: "function-body"   // smaller eval wrapper
  });

  const { default: MDXContent } =
    await import(`data:text/javascript;base64,${btoa(String(compiled))}`);

  render(<MDXContent />, document.getElementById("root"));
</script>
```