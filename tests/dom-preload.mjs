// Browser dependencies initialize DOM helpers during module evaluation.
import { JSDOM } from 'jsdom';
globalThis.document = new JSDOM('').window.document;
