import { defineHastPlugin } from "satteri";

// GitHub-style callouts: a blockquote starting with [!NOTE], [!TIP], [!IMPORTANT],
// [!WARNING] or [!CAUTION] gets class="alert alert-important" and a label on top
const TYPES = ["note", "tip", "important", "warning", "caution"];
const MARKER = /^\s*\[!(\w+)\][ \t]*\n?/;

export default defineHastPlugin({
  name: "alerts",
  element: {
    filter: ["blockquote"],
    visit(node, ctx) {
      const para = node.children.find((child) => child.type === "element");
      const text = para?.tagName === "p" && para.children[0];
      const match = text?.type === "text" && text.value.match(MARKER);
      if (!match || !TYPES.includes(match[1].toLowerCase())) return;
      const type = match[1].toLowerCase();

      // drop the marker; drop the paragraph too if the marker was all it held
      const rest = text.value.slice(match[0].length);
      if (rest || para.children.length > 1) {
        ctx.replaceNode(text, rest ? { type: "text", value: rest } : []);
      } else {
        ctx.removeNode(para);
      }

      ctx.setProperty(node, "className", ["alert", `alert-${type}`]);
      ctx.prependChild(node, {
        type: "element",
        tagName: "p",
        properties: { className: ["alert-title"] },
        children: [{ type: "text", value: type.toUpperCase() }],
      });
    },
  },
});
