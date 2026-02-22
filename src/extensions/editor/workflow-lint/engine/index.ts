export { applyAlignment } from './alignment';
export {
  DEFAULT_LINT_CONFIG,
  N8N_DEFAULT_STICKY_HEX,
  N8N_STICKY_COLOR_MAP,
  normalizeStickyColor,
} from './defaults';
export { applyLayout } from './layout';
export { applyNaming } from './naming';
export { buildNodeSizesByName } from './node-sizes';
export { applyNumbering } from './numbering';
export { applyStickyNotes } from './sticky-notes';
export { analyzeTopology } from './topology';
export type {
  ConnectionMap,
  LintConfig,
  LintResult,
  LintableNode,
  LintableWorkflow,
  NodeSize,
  NodeSizeMap,
  TopologyResult,
} from './types';

import { applyAlignment } from './alignment';
import { applyLayout } from './layout';
import { applyNaming } from './naming';
import { buildNodeSizesByName } from './node-sizes';
import { applyNumbering } from './numbering';
import { applyStickyNotes } from './sticky-notes';
import { analyzeTopology } from './topology';
import type { LintConfig, LintResult, LintableWorkflow, NodeSize } from './types';

export function lintWorkflow(
  workflow: LintableWorkflow,
  config: LintConfig,
  nodeSizesById?: Map<string, NodeSize>,
): LintResult {
  const changes: string[] = [];

  if (workflow.nodes.length === 0) {
    return { nodes: [], connections: {}, isModified: false, changes: [] };
  }

  let nodes = structuredClone(workflow.nodes);
  let connections = structuredClone(workflow.connections);

  const namingResult = applyNaming(nodes, connections, config.naming);
  nodes = namingResult.nodes;
  connections = namingResult.connections;
  if (namingResult.renames.size > 0) {
    changes.push(`Renamed ${namingResult.renames.size} node(s)`);
  }

  const prelimTopology = analyzeTopology(nodes, connections, config.triggerTypes);

  const numberingResult = applyNumbering(nodes, connections, prelimTopology, config.numbering);
  nodes = numberingResult.nodes;
  connections = numberingResult.connections;
  if (config.numbering.enabled) {
    changes.push(`Numbered ${prelimTopology.sections.length} section(s)`);
  }

  const topology = analyzeTopology(nodes, connections, config.triggerTypes);

  const nodeSizes = buildNodeSizesByName(nodes, nodeSizesById ?? new Map());

  const layoutNodes = applyLayout(nodes, topology, config.layout, nodeSizes);
  if (config.layout.enabled) {
    const positionsChanged = layoutNodes.some((n, i) => {
      const orig = nodes[i];
      if (!orig) return false;
      return n.position[0] !== orig.position[0] || n.position[1] !== orig.position[1];
    });
    if (positionsChanged) {
      changes.push('Repositioned nodes');
    }
  }
  nodes = layoutNodes;

  nodes = applyAlignment(nodes, connections, topology, config.alignment);
  if (config.alignment.enabled) {
    changes.push('Aligned connections');
  }

  const stickyNodes = applyStickyNotes(
    nodes,
    topology,
    numberingResult.sectionLabels,
    config.stickyNotes,
    nodeSizes,
  );
  if (stickyNodes.length !== nodes.length) {
    const added = stickyNodes.length - nodes.length;
    if (added > 0) {
      changes.push(`Added ${added} sticky note(s)`);
    } else {
      changes.push(`Removed ${Math.abs(added)} sticky note(s)`);
    }
  }
  nodes = stickyNodes;

  const isModified = changes.length > 0;

  return { nodes, connections, isModified, changes };
}
