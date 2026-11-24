// the PDFs in public/papers. Each gets a reader page at /papers/<slug>/ (src/pages/papers/[slug].astro)
// with its first-page thumbnail in public/papers/thumbs/<slug>.png. `project` is the write-up it belongs to
export const papers = [
  { slug: "english-layout", title: "The best English layout", project: "gecko" },
  { slug: "layout-ranking", title: "Ranking the modern layouts", project: "gecko" },
  { slug: "cost-validity", title: "Is the cost function right?", project: "gecko" },
  { slug: "cost-optimization", title: "Optimizing the cost function", project: "gecko" },
  { slug: "programming-layout", title: "The best programming layout", project: "gecko" },
  { slug: "vim-layout", title: "The best layout for a Vim programmer", project: "gecko" },
  { slug: "symbol-layer", title: "Symbol layers for programming and Vim", project: "gecko" },
  { slug: "inverse-fit", title: "What layout designers value", project: "gecko" },
  { slug: "software", title: "How GECKO works", project: "gecko" },
];

export const paper = (slug) => papers.find((p) => p.slug === slug);
