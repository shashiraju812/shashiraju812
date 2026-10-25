import DOMPurify from "dompurify";

/**
 * GitHub's README HTML is already rendered server-side, but we still sanitize it
 * (defense in depth), resolve relative links/images against the repo, and make
 * every external link open safely in a new tab.
 */
export function sanitizeReadme(html: string, owner: string, repo: string, branch: string): string {
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  const blobBase = `https://github.com/${owner}/${repo}/blob/${branch}/`;
  const resolve = (value: string, base: string) => {
    try {
      return new URL(value, base).toString();
    } catch {
      return value;
    }
  };

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src");
      if (src && !/^(https?:|data:|\/\/)/i.test(src)) node.setAttribute("src", resolve(src, rawBase));
      node.setAttribute("loading", "lazy");
      node.setAttribute("referrerpolicy", "no-referrer");
    }
    if (node.tagName === "A") {
      const href = node.getAttribute("href");
      if (href && !href.startsWith("#")) {
        if (!/^(https?:|mailto:)/i.test(href)) node.setAttribute("href", resolve(href, blobBase));
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  });

  try {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
    });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}
