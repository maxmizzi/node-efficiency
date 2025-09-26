# Dusty Efficiency Linter

Dusty is an efficiency-focused linter for JavaScript and Node.js projects that helps identify performance anti-patterns and optimization opportunities.

## Features

### Lazy Import Heavy JavaScript Dependencies

The primary rule implemented is `lazy-import-heavy-js-deps`, which detects heavy JavaScript dependencies that are imported at the top-level of modules and suggests lazy loading them to improve startup performance.

#### Heavy Dependencies Detected

The linter identifies the following categories of heavy dependencies:

- **Build tools and bundlers**: webpack, rollup, vite, esbuild, parcel
- **Testing frameworks**: jest, mocha, jasmine, cypress, playwright  
- **Transpilers and compilers**: babel, @babel/core, typescript, ts-node
- **Linters and formatters**: eslint, prettier, jshint
- **Heavy utility libraries**: lodash, moment, axios, request
- **Framework libraries**: react, vue, angular, express
- **Development tools**: nodemon, pm2, forever

#### Usage

**Via Makefile:**
```bash
make lint-dusty
```

**Direct usage:**
```bash
node tools/dusty/index.js <files-or-directories>
```

**Examples:**
```bash
# Lint specific files
node tools/dusty/index.js lib/fs.js lib/http.js

# Lint directories
node tools/dusty/index.js lib/ benchmark/

# Lint with configuration
node tools/dusty/index.js --config dusty.config.json lib/
```

#### Integration

The dusty linter is integrated into:

1. **Makefile**: `make lint-dusty` and included in `make lint`
2. **GitHub Actions**: Runs automatically on pull requests via `.github/workflows/dusty.yml`

#### Configuration

Configuration is handled via `dusty.config.json`:

```json
{
  "rules": {
    "lazy-import-heavy-js-deps": {
      "enabled": true,
      "severity": "warning",
      "additionalHeavyDeps": ["custom-heavy-lib"]
    }
  },
  "patterns": ["lib/**/*.js", "lib/**/*.mjs"],
  "exclude": ["**/node_modules/**", "**/test/**"]
}
```

#### Example Output

```
Dusty Efficiency Linter Results:
=================================
lib/example.js:
  warning: Heavy dependency 'webpack' should be lazily loaded to improve startup performance. Consider using dynamic import() or require() inside functions. [lazy-import-heavy-js-deps]

Found 1 efficiency issues.
```

#### Recommended Fixes

**Before (inefficient):**
```javascript
const webpack = require('webpack');
const babel = require('@babel/core');
import lodash from 'lodash';

function processFiles() {
  // Use webpack, babel, lodash...
}
```

**After (efficient):**
```javascript
function processFiles() {
  // Lazy load heavy dependencies only when needed
  const webpack = require('webpack');
  const babel = require('@babel/core');
  const lodash = await import('lodash');
  
  // Use webpack, babel, lodash...
}
```

This approach improves application startup time by deferring the loading of heavy dependencies until they are actually needed.

## Dependencies

- `acorn`: JavaScript parser for AST analysis
- `acorn-walk`: AST traversal utilities

## Development

To modify or extend the dusty linter:

1. Edit `tools/dusty/index.js` for core functionality
2. Update `tools/dusty/dusty.config.json` for configuration
3. Run tests with `node tools/dusty/index.js /path/to/test/files`
4. Integration tests via `make lint-dusty`