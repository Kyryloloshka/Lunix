import type { TestInstance, TestNode } from 'test-renderer';

/** A touchable control found in a rendered tree that does not meet the accessibility contract. */
export interface A11yViolation {
  problem: string;
  /** Visible text inside the control, to find it in the source. */
  text: string;
}

function textOf(element: TestInstance): string {
  return element.children
    .map((child: TestNode) => (typeof child === 'string' ? child : textOf(child)))
    .join('')
    .trim();
}

function walk(element: TestInstance, visit: (node: TestInstance) => void) {
  visit(element);
  for (const child of element.children) {
    if (typeof child !== 'string') walk(child, visit);
  }
}

/** Pressable / touchable hosts carry responder handlers; plain views and text do not. */
function isTouchable(element: TestInstance): boolean {
  const props = element.props;
  if (props.pointerEvents === 'none') return false;
  return typeof props.onResponderGrant === 'function' || typeof props.onClick === 'function';
}

/**
 * Every touchable control needs a role and an accessible name (an explicit label or visible text),
 * and `tab` controls must expose their `selected` state. Pure so it can be unit-tested on its own.
 */
export function auditTouchables(root: TestInstance): A11yViolation[] {
  const violations: A11yViolation[] = [];
  walk(root, (node) => {
    if (!isTouchable(node)) return;
    const props = node.props;
    const text = textOf(node);
    const role = props.accessibilityRole ?? props.role;
    const label = props.accessibilityLabel ?? props['aria-label'];
    if (!role) violations.push({ problem: 'missing accessibilityRole', text });
    if (!label && !text) violations.push({ problem: 'missing accessibilityLabel (and no visible text)', text });
    if (role === 'tab' && typeof props.accessibilityState?.selected !== 'boolean') {
      violations.push({ problem: 'tab without accessibilityState.selected', text });
    }
  });
  return violations;
}

export function countTouchables(root: TestInstance): number {
  let count = 0;
  walk(root, (node) => {
    if (isTouchable(node)) count += 1;
  });
  return count;
}
