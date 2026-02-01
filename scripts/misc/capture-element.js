(() => {
  window.captureElement = (selector) => {
    let element;

    if (!selector || selector === '*') {
      element = document.documentElement;
      console.log('Capturing entire page...');
    } else if (typeof selector === 'string') {
      element = document.querySelector(selector);
    } else {
      element = selector;
    }

    if (!element) {
      console.error('Element not found:', selector);
      return null;
    }

    const getAppliedStyles = (el) => {
      const computed = getComputedStyle(el);
      const styles = {};

      const dominated = [
        'display', 'position', 'top', 'left', 'right', 'bottom',
        'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-radius', 'border-color', 'border-width', 'border-style',
        'background', 'background-color', 'background-image',
        'color', 'font-family', 'font-size', 'font-weight', 'line-height',
        'text-align', 'text-decoration', 'white-space', 'overflow',
        'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
        'grid', 'grid-template-columns', 'grid-template-rows',
        'box-shadow', 'opacity', 'z-index', 'cursor', 'transition', 'transform'
      ];

      for (const prop of dominated) {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px' && value !== 'rgba(0, 0, 0, 0)') {
          styles[prop] = value;
        }
      }

      return styles;
    };

    const captureNode = (node, depth = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        return text ? { type: 'text', content: text } : null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const el = node;
      const result = {
        tag: el.tagName.toLowerCase(),
        classes: Array.from(el.classList),
        attributes: {},
        styles: getAppliedStyles(el),
        children: []
      };

      for (const attr of el.attributes) {
        if (attr.name !== 'class' && attr.name !== 'style') {
          result.attributes[attr.name] = attr.value;
        }
      }

      for (const child of el.childNodes) {
        const captured = captureNode(child, depth + 1);
        if (captured) {
          result.children.push(captured);
        }
      }

      return result;
    };

    const toHtmlString = (node, indent = 0) => {
      const pad = '  '.repeat(indent);

      if (node.type === 'text') {
        return `${pad}${node.content}`;
      }

      const classStr = node.classes.length ? ` class="${node.classes.join(' ')}"` : '';
      const attrStr = Object.entries(node.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('');

      const openTag = `<${node.tag}${classStr}${attrStr}>`;

      if (node.children.length === 0) {
        return `${pad}${openTag}</${node.tag}>`;
      }

      if (node.children.length === 1 && node.children[0].type === 'text') {
        return `${pad}${openTag}${node.children[0].content}</${node.tag}>`;
      }

      const childrenStr = node.children
        .map(c => toHtmlString(c, indent + 1))
        .join('\n');

      return `${pad}${openTag}\n${childrenStr}\n${pad}</${node.tag}>`;
    };

    const toCssString = (node, parentSelector = '') => {
      let css = '';

      if (node.type === 'text') return css;

      const selector = node.classes.length
        ? `.${node.classes.join('.')}`
        : node.tag;

      const fullSelector = parentSelector ? `${parentSelector} > ${selector}` : selector;

      if (Object.keys(node.styles).length > 0) {
        css += `${fullSelector} {\n`;
        for (const [prop, value] of Object.entries(node.styles)) {
          css += `  ${prop}: ${value};\n`;
        }
        css += '}\n\n';
      }

      for (const child of node.children || []) {
        css += toCssString(child, fullSelector);
      }

      return css;
    };

    const captured = captureNode(element);

    const output = {
      html: toHtmlString(captured),
      css: toCssString(captured),
      raw: captured
    };

    console.log('=== HTML ===\n' + output.html);
    console.log('\n=== CSS ===\n' + output.css);

    const blob = new Blob([
      '=== HTML ===\n\n',
      output.html,
      '\n\n=== CSS ===\n\n',
      output.css
    ], { type: 'text/plain' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `element-capture-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    return output;
  };

  console.log('Element capture ready. Usage:');
  console.log('  captureElement()                     - capture entire page');
  console.log('  captureElement("*")                  - capture entire page');
  console.log('  captureElement(".el-dropdown-menu")  - capture dropdown menu');
  console.log('  captureElement(".el-dialog")         - capture dialog');
  console.log('  captureElement(document.querySelector(...)) - capture any element');
})();
