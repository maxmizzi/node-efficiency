#!/usr/bin/env node
/**
 * Dusty Efficiency Linter for Node.js
 * 
 * This tool implements efficiency rules for JavaScript/Node.js code,
 * focusing on lazy loading of heavy dependencies and performance optimizations.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('acorn');
const { simple: walk } = require('acorn-walk');

// Heavy JavaScript dependencies that should be lazily loaded
const HEAVY_DEPENDENCIES = [
  // Build tools and bundlers
  'webpack', 'rollup', 'vite', 'esbuild', 'parcel',
  
  // Testing frameworks  
  'jest', 'mocha', 'jasmine', 'cypress', 'playwright',
  
  // Transpilers and compilers
  'babel', '@babel/core', 'typescript', 'ts-node',
  
  // Linters and formatters
  'eslint', 'prettier', 'jshint',
  
  // Heavy utility libraries
  'lodash', 'moment', 'axios', 'request',
  
  // Framework libraries
  'react', 'vue', 'angular', 'express',
  
  // Development tools
  'nodemon', 'pm2', 'forever'
];

class DustyLinter {
  constructor() {
    this.errors = [];
  }

  lint(filePath, content) {
    try {
      const ast = parse(content, {
        ecmaVersion: 2022,
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true
      });

      this.checkLazyImportHeavyDeps(ast, filePath);
    } catch (error) {
      // Try parsing as CommonJS
      try {
        const ast = parse(content, {
          ecmaVersion: 2022,
          sourceType: 'script',
          allowReturnOutsideFunction: true
        });
        this.checkLazyImportHeavyDeps(ast, filePath);
      } catch (e) {
        console.warn(`Unable to parse ${filePath}: ${e.message}`);
      }
    }
  }

  checkLazyImportHeavyDeps(ast, filePath) {
    const topLevelImports = new Set();
    const lazyImports = new Set();
    const self = this;
    let currentDepth = 0;

    // Simple recursive walker to handle different AST structures
    function walkNode(node) {
      if (!node || typeof node !== 'object') return;

      // Handle different node types
      if (node.type === 'ImportDeclaration' && currentDepth === 0) {
        const source = node.source.value;
        if (self.isHeavyDependency(source)) {
          topLevelImports.add(source);
        }
      }

      if (node.type === 'CallExpression') {
        // Check for require() calls
        if (node.callee.name === 'require' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const moduleName = arg.value;
            
            if (self.isHeavyDependency(moduleName)) {
              if (currentDepth === 0) {
                topLevelImports.add(moduleName);
              } else {
                lazyImports.add(moduleName);
              }
            }
          }
        }

        // Check for dynamic imports
        if (node.callee.type === 'Import' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const moduleName = arg.value;
            if (self.isHeavyDependency(moduleName)) {
              lazyImports.add(moduleName);
            }
          }
        }
      }

      // Increment depth for function nodes
      const isFunctionNode = node.type === 'FunctionDeclaration' || 
                            node.type === 'FunctionExpression' || 
                            node.type === 'ArrowFunctionExpression';
      
      if (isFunctionNode) {
        currentDepth++;
      }

      // Recursively walk child nodes
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(c => {
              if (c && typeof c === 'object' && c.type) {
                walkNode(c);
              }
            });
          } else if (child.type) {
            walkNode(child);
          }
        }
      }

      if (isFunctionNode) {
        currentDepth--;
      }
    }

    walkNode(ast);

    // Report errors for top-level heavy imports
    topLevelImports.forEach(module => {
      this.errors.push({
        file: filePath,
        rule: 'lazy-import-heavy-js-deps',
        message: `Heavy dependency '${module}' should be lazily loaded to improve startup performance. Consider using dynamic import() or require() inside functions.`,
        severity: 'warning'
      });
    });
  }



  isHeavyDependency(moduleName) {
    // Check exact matches
    if (HEAVY_DEPENDENCIES.includes(moduleName)) {
      return true;
    }

    // Check for scoped packages and sub-modules
    return HEAVY_DEPENDENCIES.some(dep => {
      return moduleName.startsWith(dep + '/') || 
             moduleName.startsWith('@' + dep + '/') ||
             (dep.startsWith('@') && moduleName.startsWith(dep + '/'));
    });
  }

  getErrors() {
    return this.errors;
  }

  reset() {
    this.errors = [];
  }
}

function lintFiles(patterns) {
  const linter = new DustyLinter();
  let totalErrors = 0;

  patterns.forEach(pattern => {
    const files = findJSFiles(pattern);
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        linter.lint(file, content);
      } catch (error) {
        console.warn(`Unable to read ${file}: ${error.message}`);
      }
    });
  });

  const errors = linter.getErrors();
  
  if (errors.length > 0) {
    console.log('\nDusty Efficiency Linter Results:');
    console.log('=================================');
    
    errors.forEach(error => {
      console.log(`${error.file}:`);
      console.log(`  ${error.severity}: ${error.message} [${error.rule}]`);
      console.log('');
    });
    
    console.log(`Found ${errors.length} efficiency issues.`);
    totalErrors = errors.length;
  } else {
    console.log('Dusty efficiency linter: No issues found.');
  }

  return totalErrors;
}

function findJSFiles(pattern) {
  const files = [];
  
  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir);
      
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            walkDir(fullPath);
          }
        } else if (stat.isFile() && (entry.endsWith('.js') || entry.endsWith('.mjs'))) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      // Ignore permission errors
    }
  }

  if (fs.existsSync(pattern)) {
    const stat = fs.statSync(pattern);
    if (stat.isDirectory()) {
      walkDir(pattern);
    } else if (stat.isFile() && (pattern.endsWith('.js') || pattern.endsWith('.mjs'))) {
      files.push(pattern);
    }
  }

  return files;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node index.js <files-or-directories>');
    console.log('Example: node index.js lib/ test/ benchmark/');
    process.exit(1);
  }

  const errorCount = lintFiles(args);
  process.exit(errorCount > 0 ? 1 : 0);
}

module.exports = { DustyLinter, lintFiles };