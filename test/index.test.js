"use strict";

require("should");

const path = require("path");
const webpack = require("webpack");
const fs = require("fs");
const merge = require("webpack-merge");
const nodeSass = require("node-sass");
const dartSass = require("sass");
const customImporter = require("./tools/customImporter.js");
const customFunctions = require("./tools/customFunctions.js");
const pathToSassLoader = require.resolve("../lib/loader.js");
const testLoader = require("./tools/testLoader");
const sassLoader = require(pathToSassLoader);
const mockRequire = require("mock-require");

const CR = /\r/g;
const implementations = [nodeSass, dartSass];
const syntaxStyles = ["scss", "sass"];
const pathToErrorFileNotFound = path.resolve(__dirname, "./scss/error-file-not-found.scss");
const pathToErrorFileNotFound2 = path.resolve(__dirname, "./scss/error-file-not-found-2.scss");
const pathToErrorFile = path.resolve(__dirname, "./scss/error.scss");
const pathToErrorImport = path.resolve(__dirname, "./scss/error-import.scss");
const loaderContextMock = {
    async: Function.prototype,
    cacheable: Function.prototype,
    dependency: Function.prototype
};

Object.defineProperty(loaderContextMock, "options", {
    set() { },
    get() {
        throw new Error("webpack options are not allowed to be accessed anymore.");
    }
});

implementations.forEach(implementation => {
    const implementationName = implementation.info.split("\t")[0];

    describe(implementationName, () => {
        syntaxStyles.forEach(ext => {
            function execTest(testId, loaderOptions, webpackOptions) {
                const bundleName = "bundle." + ext + "." + implementationName + ".js";

                return new Promise((resolve, reject) => {
                    const baseConfig = merge({
                        entry: path.join(__dirname, ext, testId + "." + ext),
                        output: {
                            filename: bundleName
                        }
                    }, webpackOptions);

                    runWebpack(baseConfig, loaderOptions, (err) => err ? reject(err) : resolve());
                }).then(() => {
                    const actualCss = readBundle(bundleName);
                    const expectedCss = readCss(ext, testId);

                    // writing the actual css to output-dir for better debugging
                    // fs.writeFileSync(path.join(__dirname, "output", `${ testId }.${ ext }.css`), actualCss, "utf8");
                    actualCss.should.eql(expectedCss);
                });
            }

            describe(`sass-loader (${ ext })`, () => {
                describe("basic", () => {
                    it("should compile simple sass without errors", () => execTest("language"));
                });
                describe("imports", () => {
                    it("should resolve imports correctly", () => execTest("imports"));
                    // Test for issue: https://github.com/webpack-contrib/sass-loader/issues/32
                    it("should pass with multiple imports", () => execTest("multiple-imports"));
                    // Test for issue: https://github.com/webpack-contrib/sass-loader/issues/73
                    it("should resolve imports from other language style correctly", () => execTest("import-other-style"));
                    // Test for includePath imports
                    it("should resolve imports from another directory declared by includePaths correctly", () => execTest("import-include-paths", {
                        includePaths: [path.join(__dirname, ext, "includePath")]
                    }));
                    // Legacy support for CSS imports with node-sass
                    // See discussion https://github.com/webpack-contrib/sass-loader/pull/573/files?#r199109203
                    if (implementation === nodeSass) {
                        it("should not resolve CSS imports", () => execTest("import-css"));
                    }
                    it("should compile bootstrap-sass without errors", () => execTest("bootstrap-sass"));
                    it("should correctly import scoped npm packages", () => execTest("import-from-npm-org-pkg"));
                    it("should resolve aliases", () => execTest("import-alias", {}, {
                        resolve: {
                            alias: {
                                "path-to-alias": path.join(__dirname, ext, "another", "alias." + ext)
                            }
                        }
                    }));
                });
                describe("custom importers", () => {
                    it("should use custom importer", () => execTest("custom-importer", {
                        importer: customImporter
                    }));
                });
                describe("custom functions", () => {
                    it("should expose custom functions", () => execTest("custom-functions", {
                        functions: customFunctions(implementation)
                    }));
                });
                describe("prepending data", () => {
                    it("should extend the data-option if present", () => execTest("prepending-data", {
                        data: "$prepended-data: hotpink" + (ext === "sass" ? "\n" : ";")
                    }));
                });
                // See https://github.com/webpack-contrib/sass-loader/issues/21
                describe("empty files", () => {
                    it("should compile without errors", () => execTest("empty"));
                });
            });
        });

        describe("sass-loader", () => {
            describe("multiple compilations", () => {
                it("should not interfere with each other", () =>
                    new Promise((resolve, reject) => {
                        runWebpack({
                            entry: {
                                b: path.join(__dirname, "scss", "multipleCompilations", "b.scss"),
                                c: path.join(__dirname, "scss", "multipleCompilations", "c.scss"),
                                a: path.join(__dirname, "scss", "multipleCompilations", "a.scss"),
                                d: path.join(__dirname, "scss", "multipleCompilations", "d.scss"),
                                e: path.join(__dirname, "scss", "multipleCompilations", "e.scss"),
                                f: path.join(__dirname, "scss", "multipleCompilations", "f.scss"),
                                g: path.join(__dirname, "scss", "multipleCompilations", "g.scss"),
                                h: path.join(__dirname, "scss", "multipleCompilations", "h.scss")
                            },
                            output: {
                                filename: "bundle.multiple-compilations.[name].js"
                            }
                        }, {}, err => err ? reject(err) : resolve());
                    })
                        .then(() => {
                            const expectedCss = readCss("scss", "imports");
                            const a = readBundle("bundle.multiple-compilations.a.js");
                            const b = readBundle("bundle.multiple-compilations.b.js");
                            const c = readBundle("bundle.multiple-compilations.c.js");
                            const d = readBundle("bundle.multiple-compilations.d.js");
                            const e = readBundle("bundle.multiple-compilations.e.js");
                            const f = readBundle("bundle.multiple-compilations.f.js");
                            const g = readBundle("bundle.multiple-compilations.g.js");
                            const h = readBundle("bundle.multiple-compilations.h.js");

                            a.should.equal(expectedCss);
                            b.should.equal(expectedCss);
                            c.should.equal(expectedCss);
                            d.should.equal(expectedCss);
                            e.should.equal(expectedCss);
                            f.should.equal(expectedCss);
                            g.should.equal(expectedCss);
                            h.should.equal(expectedCss);
                        })
                );
            });
            describe("source maps", () => {
                function buildWithSourceMaps() {
                    return new Promise((resolve, reject) => {
                        webpack({
                            entry: path.join(__dirname, "scss", "imports.scss"),
                            mode: "development",
                            output: {
                                path: path.join(__dirname, "output"),
                                filename: "bundle.source-maps.js",
                                libraryTarget: "commonjs2"
                            },
                            devtool: "source-map",
                            module: {
                                rules: [{
                                    test: /\.scss$/,
                                    use: [
                                        { loader: testLoader.filename },
                                        {
                                            loader: pathToSassLoader, options: {
                                                implementation,
                                                sourceMap: true
                                            }
                                        }
                                    ]
                                }]
                            }
                        }, (webpackErr, stats) => {
                            const err = webpackErr ||
                                  (stats.hasErrors() && stats.compilation.errors[0]) ||
                                  (stats.hasWarnings() && stats.compilation.warnings[0]);

                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                }

                it("should compile without errors", () => buildWithSourceMaps());
                it("should produce a valid source map", () => {
                    const cwdGetter = process.cwd;
                    const fakeCwd = path.join(__dirname, "scss");

                    process.cwd = function () {
                        return fakeCwd;
                    };

                    /**
                     * Note: this test only tests the "standard" source map
                     * format. It does not test the "sections" source map
                     * format.
                     *
                     * @see Source Map Revision 3 Proposal's [Proposed Format]{@link https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.qz3o9nc69um5}
                     */
                    return buildWithSourceMaps()
                        .then(() => {
                            const resourcePath = path.join(__dirname, "scss", "imports.scss");
                            const fileBase = path.basename(resourcePath);
                            const sourceMap = testLoader.sourceMap;

                            /**
                             * The value of the "sourceRoot" as passed to
                             * node-sass.
                             *
                             * @type {String|undefined|null}
                             */
                            const sourceRootOption = undefined;

                            /**
                             * The source map is a single JSON object.
                             */
                            (sourceMap).should.be.an.Object();

                            /**
                             * Required. File version must be a positive
                             * integer.
                             */
                            (sourceMap.version).should.be.a.Number().and.be.greaterThan(0);
                            (sourceMap.version % 1).should.equal(0);

                            /**
                             * Optional. File is an optional name of the
                             * generated code that this source map is associated
                             * with. This is a URL string that is relative to
                             * source map. Typically it is just the file name
                             * and extension.
                             */
                            if (sourceMap.file != null) {
                                (sourceMap.file).should.equal(fileBase);
                            }

                            /**
                             * Optional. An optional source root, useful for
                             * relocating source files on a server or removing
                             * repeated values in the "sources" entry. This
                             * value is prepended to the individual entries in
                             * the "source" field. This is a URL string,
                             * undefined, or null.
                             */
                            if (sourceRootOption != null) {
                                (sourceMap.sourceRoot).should.equal(sourceRootOption);
                            } else if (sourceMap.sourceRoot != null) {
                                (sourceMap.sourceRoot).should.be.a.String();
                            }

                            /**
                             * Required. Sources is an array original sources
                             * used by the "mappings" entry. Sources are
                             * URLs that are relative to the source map.
                             */
                            (sourceMap.sources).should.be.an.Array();

                            /**
                             * Optional. An optional array of source content,
                             * useful when the "source" can’t be hosted. The
                             * contents are listed in the same order as the
                             * sources in the "sources" entry. "null" may be
                             * used if some original sources should be retrieved
                             * by name.
                             */
                            if (sourceMap.sourcesContent != null) {
                                (sourceMap.sourcesContent).should.be.an.Array();
                                (sourceMap.sourcesContent).should.have.length(sourceMap.sources.length);
                            }

                            /**
                             * Required. Names is an array of symbol names used
                             * by the "mappings" entry.
                             */
                            (sourceMap.names).should.be.an.Array();

                            /**
                             * Required. Mappings is a string with encoded
                             * mapping data.
                             */
                            (sourceMap.mappings).should.be.a.String();

                            process.cwd = cwdGetter;
                        });
                });
            });
            describe("errors", () => {
                it("should throw an error in synchronous loader environments", () => {
                    try {
                        sassLoader.call(Object.create(loaderContextMock), "");
                    } catch (err) {
                        // check for file excerpt
                        err.message.should.equal("Synchronous compilation is not supported anymore. See https://github.com/webpack-contrib/sass-loader/issues/333");
                    }
                });
                it("should output understandable errors in entry files", (done) => {
                    runWebpack({
                        entry: pathToErrorFile
                    }, {}, (err) => {
                        if (implementation === nodeSass) {
                            err.message.should.match(/Property "some-value" must be followed by a ':'/);
                            err.message.should.match(/\(line 2, column 5\)/);
                        } else {
                            err.message.should.match(/Expected "{"./);
                            err.message.should.match(/\(line 3, column 1\)/);
                        }
                        err.message.indexOf(pathToErrorFile).should.not.equal(-1);
                        done();
                    });
                });
                it("should output understandable errors of imported files", (done) => {
                    runWebpack({
                        entry: pathToErrorImport
                    }, {}, (err) => {
                        // check for file excerpt
                        if (implementation === nodeSass) {
                            err.message.should.match(/Property "some-value" must be followed by a ':'/);
                            err.message.should.match(/\(line 2, column 5\)/);
                        } else {
                            err.message.should.match(/Expected "{"./);
                            err.message.should.match(/\(line 3, column 1\)/);
                        }
                        err.message.indexOf(pathToErrorFile).should.not.equal(-1);
                        done();
                    });
                });
                it("should output understandable errors when a file could not be found", (done) => {
                    runWebpack({
                        entry: pathToErrorFileNotFound
                    }, {}, (err) => {
                        err.message.should.match(/@import "does-not-exist";/);
                        if (implementation === nodeSass) {
                            err.message.should.match(/File to import not found or unreadable: does-not-exist/);
                            err.message.should.match(/\(line 1, column 1\)/);
                        } else {
                            err.message.should.match(/Can't find stylesheet to import\./);
                            err.message.should.match(/\(line 1, column 9\)/);
                        }
                        err.message.indexOf(pathToErrorFileNotFound).should.not.equal(-1);
                        done();
                    });
                });
                it("should not auto-resolve imports with explicit file names", (done) => {
                    runWebpack({
                        entry: pathToErrorFileNotFound2
                    }, {}, (err) => {
                        err.message.should.match(/@import "\.\/another\/_module\.scss";/);
                        if (implementation === nodeSass) {
                            err.message.should.match(/File to import not found or unreadable: \.\/another\/_module\.scss/);
                            err.message.should.match(/\(line 1, column 1\)/);
                        } else {
                            err.message.should.match(/Can't find stylesheet to import\./);
                            err.message.should.match(/\(line 1, column 9\)/);
                        }
                        err.message.indexOf(pathToErrorFileNotFound2).should.not.equal(-1);
                        done();
                    });
                });
                it("should not swallow errors when trying to load node-sass", (done) => {
                    mockRequire.reRequire(pathToSassLoader);
                    const module = require("module");
                    const originalResolve = module._resolveFilename;

                    module._resolveFilename = function (filename) {
                        if (!filename.match(/node-sass/)) {
                            return originalResolve.apply(this, arguments);
                        }
                        const err = new Error("Some error");

                        err.code = "MODULE_NOT_FOUND";
                        throw err;
                    };
                    runWebpack({
                        entry: pathToSassLoader + "!" + pathToErrorFile
                    }, { implementation: null }, (err) => {
                        module._resolveFilename = originalResolve;
                        mockRequire.reRequire("node-sass");
                        err.message.should.match(/Some error/);
                        done();
                    });
                });
                it("should output a message when the Sass info is unparseable", (done) => {
                    mockRequire.reRequire(pathToSassLoader);
                    runWebpack({
                        entry: pathToErrorFile
                    }, {
                        implementation: merge(nodeSass, { info: "asdfj" })
                    }, (err) => {
                        err.message.should.match(/Unknown Sass implementation "asdfj"\./);
                        done();
                    });
                });
                it("should output a message when the Sass version is unparseable", (done) => {
                    mockRequire.reRequire(pathToSassLoader);
                    runWebpack({
                        entry: pathToErrorFile
                    }, {
                        implementation: merge(nodeSass, { info: "node-sass\t1" })
                    }, (err) => {
                        err.message.should.match(/Invalid Sass version "1"\./);
                        done();
                    });
                });
                it("should output a message when Node Sass is an incompatible version", (done) => {
                    mockRequire.reRequire(pathToSassLoader);
                    runWebpack({
                        entry: pathToErrorFile
                    }, {
                        implementation: merge(nodeSass, { info: "node-sass\t3.0.0" })
                    }, (err) => {
                        err.message.should.match(/Node Sass version 3\.0\.0 is incompatible with \^4\.0\.0\./);
                        done();
                    });
                });
                it("should output a message when Dart Sass is an incompatible version", (done) => {
                    mockRequire.reRequire(pathToSassLoader);
                    runWebpack({
                        entry: pathToErrorFile
                    }, {
                        implementation: merge(nodeSass, { info: "dart-sass\t1.2.0" })
                    }, (err) => {
                        err.message.should.match(/Dart Sass version 1\.2\.0 is incompatible with \^1\.3\.0\./);
                        done();
                    });
                });
                it("should output a message for an unknown sass implementation", (done) => {
                    mockRequire.reRequire(pathToSassLoader);
                    runWebpack({
                        entry: pathToErrorFile
                    }, {
                        implementation: merge(nodeSass, { info: "strange-sass\t1.0.0" })
                    }, (err) => {
                        err.message.should.match(/Unknown Sass implementation "strange-sass"\./);
                        done();
                    });
                });
            });
        });

        function readCss(ext, id) {
            return fs.readFileSync(path.join(__dirname, ext, "spec", implementationName, id + ".css"), "utf8").replace(CR, "");
        }

        function runWebpack(baseConfig, loaderOptions, done) {
            const webpackConfig = merge({
                mode: "development",
                output: {
                    path: path.join(__dirname, "output"),
                    filename: "bundle.js",
                    libraryTarget: "commonjs2"
                },
                module: {
                    rules: [{
                        test: /\.s[ac]ss$/,
                        use: [
                            { loader: "raw-loader" },
                            {
                                loader: pathToSassLoader,
                                options: merge({ implementation }, loaderOptions)
                            }
                        ]
                    }]
                }
            }, baseConfig);

            webpack(webpackConfig, (webpackErr, stats) => {
                const err = webpackErr ||
                    (stats.hasErrors() && stats.compilation.errors[0]) ||
                    (stats.hasWarnings() && stats.compilation.warnings[0]);

                done(err || null);
            });
        }
    });
});

function readBundle(filename) {
    delete require.cache[path.resolve(__dirname, `./output/${ filename }`)];

    return require(`./output/${ filename }`);
}
