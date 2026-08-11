// @packkit/core/node — Node-only surface (imports node:fs/path). Keep out of the
// default entry so browser bundles stay clean.
export { writeGeneratedProject } from './writer.js';
