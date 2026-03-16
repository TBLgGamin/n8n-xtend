export { applyAlignment } from './alignment';
export { DEFAULT_LINT_CONFIG, normalizeStickyColor } from './defaults';
export { applyLayout } from './layout';
export { applyNaming, formatCollisionSuffix, NUMBER_SUFFIX_PATTERN } from './naming';
export { buildNodeSizesByName } from './node-sizes';
export { applyNumbering } from './numbering';
export { buildPositionMap, renameConnections, snapToGrid } from './shared';
export { applyStickyNotes } from './sticky-notes';
export { analyzeTopology, sortSections } from './topology';
export { STICKY_NOTE_TYPE } from './types';
export type {
  ConnectionMap,
  LintConfig,
  LintPositionMap,
  LintResult,
  LintableNode,
  LintableWorkflow,
  NodeSize,
  NodeSizeMap,
  TopologyResult,
} from './types';

import { logger } from '@/shared/utils';
import { applyAlignment } from './alignment';
import { applyLayout } from './layout';
import { applyNaming } from './naming';
import { buildNodeSizesByName } from './node-sizes';
import { applyNumbering } from './numbering';
import { applyStickyNotes } from './sticky-notes';
import { analyzeTopology, sortSections } from './topology';
import { STICKY_NOTE_TYPE } from './types';
import type { LintConfig, LintPositionMap, LintResult, LintableWorkflow, NodeSize } from './types';

const log = logger.child('lint:engine');

export function lintWorkflow(
  workflow: LintableWorkflow,
  config: LintConfig,
  nodeSizesById?: Map<string, NodeSize>,
  nodeTypeNames?: Map<string, string>,
  previousLintPositions: LintPositionMap = {},
): LintResult {
  const changes: string[] = [];

  if (workflow.nodes.length === 0) {
    return { nodes: [], connections: {}, isModified: false, changes: [], lintPositions: {} };
  }

  log.debug('Running lint pipeline', { nodeCount: workflow.nodes.length });

  let nodes = workflow.nodes.map((n) => ({ ...n }));
  let connections = { ...workflow.connections };

  const namingResult = applyNaming(nodes, connections, config.naming, nodeTypeNames);
  nodes = namingResult.nodes;
  connections = namingResult.connections;
  if (namingResult.renames.size > 0) {
    changes.push(`Renamed ${namingResult.renames.size} node(s)`);
  }

  const prelimTopology = analyzeTopology(nodes, connections, config.triggerTypes);
  sortSections(prelimTopology, config.layout.sectionOrder, nodes, config.layout.direction);

  const numberingResult = applyNumbering(
    nodes,
    connections,
    prelimTopology,
    config.numbering,
    config.naming.collisionFormat,
  );
  nodes = numberingResult.nodes;
  connections = numberingResult.connections;
  if (config.numbering.enabled) {
    changes.push(`Numbered ${prelimTopology.sections.length} section(s)`);
  }

  const topology = analyzeTopology(nodes, connections, config.triggerTypes);
  sortSections(topology, config.layout.sectionOrder, nodes, config.layout.direction);

  const nodeSizes = buildNodeSizesByName(nodes, nodeSizesById ?? new Map());

  const layoutNodes = applyLayout(nodes, topology, config.layout, nodeSizes, previousLintPositions);
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

  nodes = applyAlignment(nodes, connections, topology, config.alignment, config.layout);
  if (config.alignment.enabled) {
    changes.push('Aligned connections');
  }

  const stickyNodes = applyStickyNotes(
    nodes,
    topology,
    numberingResult.sectionLabels,
    config.stickyNotes,
    nodeSizes,
    config.layout,
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

  const lintPositions: LintPositionMap = {};
  for (const node of nodes) {
    if (node.type !== STICKY_NOTE_TYPE) {
      lintPositions[node.id] = node.position;
    }
  }

  const isModified = changes.length > 0;

  log.debug('Lint pipeline complete', { isModified, changes });

  return { nodes, connections, isModified, changes, lintPositions };
}
