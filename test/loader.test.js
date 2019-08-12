/**
 * @jest-environment node
 */
import path from 'path';

import nodeSass from 'node-sass';
import dartSass from 'sass';

import {
  compile,
  getTestId,
  getCode,
  getPureCode,
  getImplementationByName,
  normalizeError,
} from './helpers';

import customImporter from './helpers/customImporter';
import customFunctions from './helpers/customFunctions';

const implementations = [nodeSass, dartSass];
const syntaxStyles = ['scss', 'sass'];

describe('loader', () => {
  implementations.forEach((implementation) => {
    const [implementationName] = implementation.info.split('\t');

    syntaxStyles.forEach((syntax) => {
      it(`should work (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "importer" option (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('custom-importer', syntax);
        const options = {
          importer: customImporter,
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "functions" option as an object (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('custom-functions', syntax);
        const options = {
          functions: customFunctions(implementation),
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "functions" option as an object (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('custom-functions', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          functions: customFunctions(implementation),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "functions" option as a function (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('custom-functions', syntax);
        const options = {
          functions: (loaderContext) => {
            expect(loaderContext).toBeDefined();

            return customFunctions(implementation);
          },
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "data" option as a string (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('prepending-data', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          data: `$prepended-data: hotpink${syntax === 'sass' ? '\n' : ';'}`,
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "data" option as a function (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('prepending-data', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          data: (loaderContext) => {
            expect(loaderContext).toBeDefined();

            return `$prepended-data: hotpink${syntax === 'sass' ? '\n' : ';'}`;
          },
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "includePaths" option (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-include-paths', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          includePaths: [path.resolve(__dirname, syntax, 'includePath')],
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      // See https://github.com/webpack-contrib/sass-loader/issues/21
      it(`should work with an empty file (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('empty', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should output an understandable error (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('error', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(
          stats.compilation.errors.map((error) => normalizeError(error))
        ).toMatchSnapshot('errors');
      });

      it(`should output an understandable error when the problem in "@import" (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('error-import', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(
          stats.compilation.errors.map((error) => normalizeError(error))
        ).toMatchSnapshot('errors');
      });

      it(`should output an understandable error when a file could not be found (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('error-file-not-found', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(
          stats.compilation.errors.map((error) => normalizeError(error))
        ).toMatchSnapshot('errors');
      });

      it(`should throw an error with a explicit file and a file does not exist (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('error-file-not-found-2', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(
          stats.compilation.errors.map((error) => normalizeError(error))
        ).toMatchSnapshot('errors');
      });

      it(`should work with difference "@import" at-rules (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('imports', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      // Test for issue: https://github.com/webpack-contrib/sass-loader/issues/32
      it(`should work with multiple "@import" at-rules (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('multiple-imports', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      // Test for issue: https://github.com/webpack-contrib/sass-loader/issues/73
      it(`should work with an "@import" at-rle from other language style (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-other-style', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work when an "@import" at-rule from scoped npm packages (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-from-npm-org-pkg', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work and use the "sass" field (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-sass-field', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work and use the "style" field (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-style-field', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work and use the "main" field (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-main-field', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work and use the "custom-sass" field (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-custom-sass-field', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, {
          loader: { options, resolve: { mainFields: ['custom-sass', '...'] } },
        });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work and use the "index" property in package (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-index', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      // Legacy support for CSS imports with node-sass
      // See discussion https://github.com/webpack-contrib/sass-loader/pull/573/files?#r199109203
      it(`should work and ignore all css "@import" at-rules (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-css', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with an alias (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-alias', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, {
          resolve: {
            alias: {
              'path-to-alias': path.resolve(
                __dirname,
                syntax,
                'another',
                `alias.${syntax}`
              ),
            },
          },
          loader: { options },
        });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "bootstrap-sass" package, directly import (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('bootstrap-sass', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "bootstrap-sass" package, import as a package (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('bootstrap-sass-package', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCode(stats).content).toBe(getPureCode(testId, options));

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });
    });
  });
});
