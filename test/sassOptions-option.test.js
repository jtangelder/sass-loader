/**
 * @jest-environment node
 */
import path from 'path';

import semver from 'semver';
import nodeSass from 'node-sass';
import dartSass from 'sass';

import {
  compile,
  getTestId,
  getCodeFromBundle,
  getCodeFromSass,
  getImplementationByName,
} from './helpers';
import customImporter from './helpers/customImporter';
import customFunctions from './helpers/customFunctions';

const implementations = [nodeSass, dartSass];
const syntaxStyles = ['scss', 'sass'];

describe('sassOptions option', () => {
  implementations.forEach((implementation) => {
    const [implementationName] = implementation.info.split('\t');

    syntaxStyles.forEach((syntax) => {
      it(`should work when the option like "Object" (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: {
            indentWidth: 10,
          },
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work when the option is empty "Object" (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: {},
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work when the option like "Function" (${implementationName}) (${syntax})`, async () => {
        expect.assertions(5);

        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: (loaderContext) => {
            expect(loaderContext).toBeDefined();

            return {
              indentWidth: 10,
            };
          },
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work when the option like "Function" and never return (${implementationName}) (${syntax})`, async () => {
        expect.assertions(5);

        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: (loaderContext) => {
            expect(loaderContext).toBeDefined();
          },
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "importer" option (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('custom-importer', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: {
            importer: customImporter,
          },
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "functions" option (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('custom-functions', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: {
            functions: customFunctions(implementation),
          },
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "includePaths" option (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('import-include-paths', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: {
            includePaths: [path.resolve(__dirname, syntax, 'includePath')],
          },
        };
        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should work with the "fibers" option (${implementationName}) (${syntax})`, async () => {
        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: {},
        };

        if (semver.satisfies(process.version, '>= 10')) {
          // eslint-disable-next-line global-require
          options.sassOptions.fibers = require('fibers');
        }

        const stats = await compile(testId, { loader: { options } });

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');
      });

      it(`should automatically use "fibers" package if it is available (${implementationName}) (${syntax})`, async () => {
        const spy = jest.spyOn(dartSass, 'render');

        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
        };

        const stats = await compile(testId, { loader: { options } });

        if (
          semver.satisfies(process.version, '>= 10') &&
          implementationName === 'dart-sass'
        ) {
          expect(spy.mock.calls[0][0]).toHaveProperty('fibers');
        }

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');

        spy.mockRestore();
      });

      it(`should not use "fibers" package if the "fibers" option is "false" (${implementationName}) (${syntax})`, async () => {
        const spy = jest.spyOn(dartSass, 'render');

        const testId = getTestId('language', syntax);
        const options = {
          implementation: getImplementationByName(implementationName),
          sassOptions: {
            fibers: false,
          },
        };

        const stats = await compile(testId, { loader: { options } });

        if (
          semver.satisfies(process.version, '>= 10') &&
          implementationName === 'dart-sass'
        ) {
          expect(spy.mock.calls[0][0]).not.toHaveProperty('fibers');
        }

        expect(getCodeFromBundle(stats).css).toBe(
          getCodeFromSass(testId, options).css
        );

        expect(stats.compilation.warnings).toMatchSnapshot('warnings');
        expect(stats.compilation.errors).toMatchSnapshot('errors');

        spy.mockRestore();
      });
    });
  });
});
