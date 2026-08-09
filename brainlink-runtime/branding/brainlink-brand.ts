const BRAND_NAME = 'Brainlink';
const BRAND_REPOSITORY = 'https://github.com/MRTNLGDR/BRAINLINK';
const ATTRIBUTE_NAMES = ['aria-label', 'alt', 'placeholder', 'title'] as const;
const BRAND_RULES: Array<[RegExp, string]> = [
  [/AFFiNE\s+AI/g, 'Brainlink AI'],
  [/AFFiNE\s+Cloud/g, 'Brainlink Sync'],
  [/AFFiNE\s+Self-hosted/g, 'Brainlink Self-hosted'],
  [/AFFiNE/g, BRAND_NAME],
  [/Brainlink\s+AI\s*·\s*Brainlink/g, 'Brainlink AI'],
  [/Brainlink\s*·\s*Brainlink/g, BRAND_NAME],
];

const brandText = (value: string) =>
  BRAND_RULES.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), value);

const brandIcon = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3159c7"/><stop offset="1" stop-color="#28a875"/></linearGradient></defs>
    <rect width="64" height="64" rx="16" fill="#11151d"/>
    <path d="M15 14h17c9 0 15 4 15 12 0 5-3 8-7 10 6 1 9 5 9 11 0 9-7 14-18 14H15V14Zm12 10v8h5c3 0 5-1 5-4s-2-4-5-4h-5Zm0 18v9h6c4 0 6-1 6-5 0-3-2-4-6-4h-6Z" fill="url(#g)"/>
  </svg>`)} `;

function brandElement(element: Element) {
  for (const name of ATTRIBUTE_NAMES) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const branded = brandText(value);
    if (branded !== value) element.setAttribute(name, branded);
  }

  if (element instanceof HTMLImageElement) {
    const description = `${element.alt} ${element.getAttribute('aria-label') ?? ''}`.toLowerCase();
    if (description.includes('app icon') || description.includes('brainlink icon')) {
      if (element.src !== brandIcon) element.src = brandIcon;
      element.dataset.brainlinkBrandIcon = 'true';
    }
  }

  if (element instanceof HTMLAnchorElement) {
    const url = new URL(element.href, window.location.href);
    if (url.hostname === 'affine.pro' && ['/download', '/blog', '/about-us'].includes(url.pathname)) {
      element.href = url.pathname === '/download' ? `${BRAND_REPOSITORY}/releases` : BRAND_REPOSITORY;
    }
  }
}

function brandNode(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    const current = root.nodeValue ?? '';
    const branded = brandText(current);
    if (branded !== current) root.nodeValue = branded;
    return;
  }

  if (root instanceof Element) brandElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const current = node.nodeValue ?? '';
      const branded = brandText(current);
      if (branded !== current) node.nodeValue = branded;
    } else if (node instanceof Element) {
      brandElement(node);
    }
    node = walker.nextNode();
  }
}

function installBrandIcon() {
  let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.append(icon);
  }
  icon.href = brandIcon;
}

function installBrainlinkBrand() {
  document.documentElement.dataset.product = 'brainlink';
  document.title = brandText(document.title || BRAND_NAME);
  installBrandIcon();
  brandNode(document.documentElement);

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (mutation.target instanceof Element) brandElement(mutation.target);
        continue;
      }
      if (mutation.type === 'characterData') {
        brandNode(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach(brandNode);
    }
    const brandedTitle = brandText(document.title || BRAND_NAME);
    if (document.title !== brandedTitle) document.title = brandedTitle;
  });

  observer.observe(document.documentElement, {
    attributeFilter: [...ATTRIBUTE_NAMES],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installBrainlinkBrand, { once: true });
} else {
  installBrainlinkBrand();
}

export { BRAND_NAME, brandText };
