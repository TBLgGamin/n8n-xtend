interface MockLocation {
  pathname: string;
  hostname: string;
  origin: string;
  href: string;
}

let mockLocation: MockLocation = {
  pathname: '/',
  hostname: 'localhost',
  origin: 'http://localhost',
  href: 'http://localhost/',
};

export function setMockLocation(config: Partial<MockLocation>): void {
  mockLocation = { ...mockLocation, ...config };
  Object.defineProperty(globalThis, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true,
  });
}

export function setupLocationMock(): void {
  setMockLocation({
    pathname: '/',
    hostname: 'localhost',
    origin: 'http://localhost',
    href: 'http://localhost/',
  });
}

export function resetLocationMock(): void {
  mockLocation = {
    pathname: '/',
    hostname: 'localhost',
    origin: 'http://localhost',
    href: 'http://localhost/',
  };
}

export function createMockElement(
  tag: string,
  attributes: Record<string, string> = {},
  children: (HTMLElement | string)[] = [],
): HTMLElement {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}

export function createMockSidebar(): HTMLElement {
  const sidebar = createMockElement('div', { id: 'sidebar' });
  const sideMenu = createMockElement('div', { className: '_sideMenu_abc123' });
  const bottomMenu = createMockElement('div', { className: '_bottomMenu_xyz789' });
  sideMenu.appendChild(bottomMenu);
  sidebar.appendChild(sideMenu);
  return sidebar;
}

export function createMockTreeView(): HTMLElement {
  const container = createMockElement('div', { id: 'n8n-tree-view' });
  const content = createMockElement('div', { id: 'n8n-tree-content' });
  container.appendChild(content);
  return container;
}

export function appendToBody(element: HTMLElement): void {
  document.body.appendChild(element);
}

export function queryById(id: string): HTMLElement | null {
  return document.getElementById(id);
}
